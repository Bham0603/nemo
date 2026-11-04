/**
 * RAG Retrieval Pipeline for RECALL Step 7.
 * Embeds the user query, calls the pgvector RPC, and returns ranked chunks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateEmbedding } from "@/lib/embeddings/service";
import { formatSearchQueryForEmbedding } from "@/lib/embeddings/formatting";
import type { RetrievedChunk } from "./types";

export interface RetrievalOptions {
  matchCount?: number;
  matchThreshold?: number;
  filterSourceIds?: string[];
  filterCollectionIds?: string[];
}

/**
 * Retrieves the most relevant knowledge chunks for a user query.
 * Applies source/collection ownership filtering implicitly via RLS.
 */
export async function retrieveRelevantChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    matchCount = 8,
    matchThreshold = 0.35,
    filterSourceIds = [],
    filterCollectionIds = [],
  } = options;

  // Format and embed the query
  const formattedQuery = formatSearchQueryForEmbedding(query);
  const queryVector = await generateEmbedding(formattedQuery);
  const queryEmbeddingStr = JSON.stringify(queryVector);

  // If specific sources are selected, retrieve for each and merge
  // Otherwise use a single collection-level or unconstrained search
  const allResults: RetrievedChunk[] = [];
  const seenChunkIds = new Set<string>();

  if (filterSourceIds.length > 0) {
    // Retrieve per source, then merge + deduplicate
    for (const sourceId of filterSourceIds) {
      const { data, error } = await supabase.rpc("search_knowledge_chunks", {
        query_embedding: queryEmbeddingStr,
        match_count: matchCount,
        match_threshold: matchThreshold,
        filter_collection_id: null,
        filter_source_id: sourceId,
      });

      if (error) {
        console.error("[Retrieval RPC Error]", error);
        continue;
      }

      for (const row of data || []) {
        if (!seenChunkIds.has(row.chunk_id)) {
          seenChunkIds.add(row.chunk_id);
          allResults.push(mapRow(row));
        }
      }
    }
  } else {
    // Single search across a collection or all user content
    const collectionId = filterCollectionIds.length === 1 ? filterCollectionIds[0] : null;

    const { data, error } = await supabase.rpc("search_knowledge_chunks", {
      query_embedding: queryEmbeddingStr,
      match_count: matchCount,
      match_threshold: matchThreshold,
      filter_collection_id: collectionId ?? null,
      filter_source_id: null,
    });

    if (error) {
      console.error("[Retrieval RPC Error]", error);
      return [];
    }

    for (const row of data || []) {
      if (!seenChunkIds.has(row.chunk_id)) {
        seenChunkIds.add(row.chunk_id);
        allResults.push(mapRow(row));
      }
    }
  }

  // Sort by similarity descending, return top matchCount
  allResults.sort((a, b) => b.similarity - a.similarity);
  return allResults.slice(0, matchCount);
}

type RpcRow = {
  chunk_id: string;
  source_id: string | null;
  note_id: string | null;
  content: string;
  chunk_index: number;
  page_number: number | null;
  source_title: string | null;
  source_type: string | null;
  collection_id: string | null;
  collection_name: string | null;
  note_title: string | null;
  similarity: number;
};

function mapRow(row: RpcRow): RetrievedChunk {
  return {
    citationId: "",                              // assigned later in context.ts
    chunkId: row.chunk_id,
    sourceId: row.source_id,
    noteId: row.note_id,
    sourceTitle: row.source_title || row.note_title || "Untitled Document",
    sourceType: row.source_type || (row.note_id ? "note" : "document"),
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: Number((row.similarity || 0).toFixed(4)),
  };
}

