import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  embedPendingChunks,
  hasUserConsent,
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
        { error: "Authentication required to backfill embeddings." },
        { status: 401 }
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file to enable vector embeddings.",
          code: "GEMINI_KEY_MISSING",
        },
        { status: 400 }
      );
    }

    const consent = await hasUserConsent(supabase, user.id);
    if (!consent) {
      return NextResponse.json(
        {
          error:
            "User consent is required before processing document embeddings with Google Gemini. Please enable consent in the Search settings.",
          code: "CONSENT_REQUIRED",
        },
        { status: 403 }
      );
    }

    let batchSize = 25;
    try {
      const body = await req.json();
      if (typeof body.batchSize === "number" && body.batchSize > 0 && body.batchSize <= 50) {
        batchSize = body.batchSize;
      }
    } catch {
      // Body is optional
    }

    const result = await embedPendingChunks(supabase, user.id, batchSize);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Backfill execution failed";
    console.error("[Embedding Backfill Error]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
