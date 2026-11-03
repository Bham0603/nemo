import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  formatSearchQueryForEmbedding,
  generateEmbedding,
  isGeminiConfigured,
} from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required to perform semantic search." },
        { status: 401 }
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API key is not configured. Please add GEMINI_API_KEY to your environment (.env.local) to enable vector similarity search.",
          code: "GEMINI_KEY_MISSING",
        },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { query, limit = 10, threshold = 0.35, collectionId, sourceId } = body || {};

    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Search query must be a non-empty string." },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (trimmedQuery.length > 1000) {
      return NextResponse.json(
        { error: "Search query exceeds maximum limit of 1000 characters." },
        { status: 400 }
      );
    }

    const matchCount = Math.min(Math.max(1, Number(limit) || 10), 50);
    const matchThreshold = Math.min(Math.max(0.0, Number(threshold) || 0.35), 1.0);

    // 1. Format retrieval query and generate 1536-dimensional embedding vector via Gemini
    const formattedQuery = formatSearchQueryForEmbedding(trimmedQuery);
    const queryVector = await generateEmbedding(formattedQuery);

    // 2. Call PostgreSQL RPC function search_knowledge_chunks
    const { data: results, error: rpcError } = await supabase.rpc(
      "search_knowledge_chunks",
      {
        query_embedding: JSON.stringify(queryVector),
        match_count: matchCount,
        match_threshold: matchThreshold,
        filter_collection_id: collectionId || null,
        filter_source_id: sourceId || null,
      }
    );

    if (rpcError) {
      console.error("[Semantic Search RPC Error]", rpcError);
      return NextResponse.json(
        { error: `Database search failed: ${rpcError.message}` },
        { status: 500 }
      );
    }

    // Format output
    const matches = (results || []).map((row) => ({
      chunkId: row.chunk_id,
      sourceId: row.source_id,
      noteId: row.note_id,
      content: row.content,
      chunkIndex: row.chunk_index,
      pageNumber: row.page_number,
      sourceTitle: row.source_title || row.note_title || "Untitled Document",
      sourceType: row.source_type || (row.note_id ? "note" : "document"),
      collectionId: row.collection_id,
      collectionName: row.collection_name || "General",
      similarity: Number((row.similarity || 0).toFixed(4)),
    }));

    return NextResponse.json({
      success: true,
      query: trimmedQuery,
      matchCount: matches.length,
      threshold: matchThreshold,
      results: matches,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Semantic search execution failed";
    console.error("[Semantic Search Error]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
