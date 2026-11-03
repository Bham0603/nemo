import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestDocumentFile } from "@/lib/ingest/pipeline";
import { MAX_FILE_BYTES } from "@/lib/ingest/validation";

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
        { error: "Authentication required to ingest documents. Please sign in." },
        { status: 401 },
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formErr: unknown) {
      const msg = formErr instanceof Error ? formErr.message : "Failed to parse upload form data.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const collection = (formData.get("collection") as string) || "Research";

    if (!file) {
      return NextResponse.json(
        { error: "No file was uploaded." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum limit of ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await ingestDocumentFile({
      userId: user.id,
      buffer,
      fileName: file.name,
      collectionName: collection,
      supabase,
    });

    return NextResponse.json({
      success: true,
      source: result.source,
      chunksCount: result.chunksCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Document ingestion failed";
    console.error("[Ingest Upload Error]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

