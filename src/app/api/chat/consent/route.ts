import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasChatConsent, setChatConsent } from "@/lib/chat/consent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const consent = await hasChatConsent(supabase, user.id);
    return NextResponse.json({ hasConsent: consent });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to query chat consent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.consent !== "boolean") {
      return NextResponse.json(
        { error: "Field 'consent' (boolean) is required." },
        { status: 400 }
      );
    }

    const result = await setChatConsent(supabase, user.id, body.consent);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update consent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasConsent: body.consent,
      message: body.consent
        ? "Consent granted for Gemini-powered conversational AI."
        : "Consent withdrawn. AI chat disabled.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update chat consent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

