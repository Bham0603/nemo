import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmbeddingStatus } from "@/lib/embeddings";

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
        { status: 401 }
      );
    }

    const status = await getEmbeddingStatus(supabase, user.id);
    return NextResponse.json(status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get embedding status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

