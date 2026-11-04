import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/conversations — List the authenticated user's conversations */
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

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, conversation_mode, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list conversations";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/conversations — Create a new conversation */
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
    const { title, mode } = body || {};

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }

    const conversationMode = mode === "regular" ? "regular" : "context";

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: title.slice(0, 200),
        conversation_mode: conversationMode,
      })
      .select("id, title, conversation_mode, created_at, updated_at")
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: error?.message || "Failed to create." }, { status: 500 });
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

