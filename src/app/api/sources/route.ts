import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    // Retrieve sources
    const { data: sources, error } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Retrieve user collections for name lookup
    const { data: collections } = await supabase
      .from("collections")
      .select("id, name")
      .eq("user_id", user.id);

    const colMap = new Map((collections || []).map((c) => [c.id, c.name]));

    // Map to frontend Source interface structure
    const formatted = (sources || []).map((s) => {
      const collectionName = (s.collection_id && colMap.get(s.collection_id)) || "Research";
      const sizeMb = s.file_size ? (s.file_size / (1024 * 1024)).toFixed(1) : "0";
      const sizeLabel = s.file_type === "link" ? "link" : `${sizeMb} MB`;

      // Extract excerpt from metadata if available
      const metaObj = (s.metadata as Record<string, unknown>) || {};
      const excerpt =
        typeof metaObj.description === "string"
          ? metaObj.description
          : s.error_message
            ? `Status: ${s.error_message}`
            : `Indexed knowledge source (${s.word_count || 0} words).`;

      return {
        id: s.id,
        title: s.title,
        kind: s.file_type || "pdf",
        collection: collectionName,
        sizeLabel,
        pages: s.page_count || undefined,
        words: s.word_count || undefined,
        uploadedAt: s.created_at.slice(0, 10),
        status: s.processing_status as "ready" | "processing" | "failed",
        excerpt,
        tags: [s.file_type || "document", collectionName.toLowerCase()],
        errorMessage: s.error_message,
      };
    });

    return NextResponse.json({ sources: formatted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch sources";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
