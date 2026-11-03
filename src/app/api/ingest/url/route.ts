import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestWebsite } from "@/lib/ingest/pipeline";

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
        { error: "Authentication required to ingest website URLs." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const url = body.url?.trim();
    const collection = body.collection || "Research";

    if (!url) {
      return NextResponse.json(
        { error: "URL is required." },
        { status: 400 },
      );
    }

    const result = await ingestWebsite({
      userId: user.id,
      url,
      collectionName: collection,
      supabase,
    });

    return NextResponse.json({
      success: true,
      source: result.source,
      chunksCount: result.chunksCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Website ingestion failed";
    console.error("[Ingest URL Error]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

