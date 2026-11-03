import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasUserConsent, setUserConsent } from "@/lib/embeddings";

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

    const consent = await hasUserConsent(supabase, user.id);
    return NextResponse.json({ hasConsent: consent });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to query consent";
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
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.consent !== "boolean") {
      return NextResponse.json(
        { error: "Field 'consent' (boolean) is required." },
        { status: 400 }
      );
    }

    const result = await setUserConsent(supabase, user.id, body.consent);
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
        ? "Consent granted for Google Gemini embeddings."
        : "Consent withdrawn. External embeddings processing disabled.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update consent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

