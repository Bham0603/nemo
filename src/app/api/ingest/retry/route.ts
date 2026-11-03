import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retrySourceIngestion } from "@/lib/ingest/pipeline";

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
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const sourceId = body.sourceId;

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required." },
        { status: 400 },
      );
    }

    const result = await retrySourceIngestion(supabase, user.id, sourceId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Retry failed";
    console.error("[Ingest Retry Error]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

