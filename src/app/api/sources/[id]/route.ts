import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/ingest/pipeline";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sourceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    // 1. Fetch source record
    const { data: source, error: sourceErr } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .eq("user_id", user.id)
      .single();

    if (sourceErr || !source) {
      return NextResponse.json(
        { error: "Source not found." },
        { status: 404 },
      );
    }

    // 2. Generate short-lived signed URL for file preview if stored in bucket
    let signedUrl: string | null = null;
    if (source.storage_path) {
      const { data: signData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(source.storage_path, 120); // 120 seconds validity

      signedUrl = signData?.signedUrl || null;
    }

    // 3. Fetch knowledge chunks for text preview
    const { data: chunks, count: chunkCount } = await supabase
      .from("knowledge_chunks")
      .select("id, chunk_index, content, page_number, metadata", {
        count: "exact",
      })
      .eq("source_id", sourceId)
      .eq("user_id", user.id)
      .order("chunk_index", { ascending: true })
      .limit(20);

    return NextResponse.json({
      source,
      signedUrl,
      chunks: chunks || [],
      chunkCount: chunkCount || (chunks || []).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load source";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sourceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    // 1. Retrieve storage path before deletion
    const { data: source } = await supabase
      .from("sources")
      .select("id, storage_path")
      .eq("id", sourceId)
      .eq("user_id", user.id)
      .single();

    if (source?.storage_path) {
      // Delete file from Supabase storage bucket
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([source.storage_path]);
    }

    // 2. Delete source record (foreign keys cascade to knowledge_chunks)
    const { error: deleteErr } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId)
      .eq("user_id", user.id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, deletedId: sourceId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete source";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

