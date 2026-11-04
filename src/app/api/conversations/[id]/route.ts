import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/conversations/[id] — Load conversation with its messages */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("id, title, conversation_mode, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (convErr || !conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select("id, role, content, citations, created_at")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({ conversation, messages: messages || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/conversations/[id] — Rename a conversation */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("conversations")
      .update({ title: body.title.slice(0, 200), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, title")
      .maybeSingle();

    if (error || !updated) {
      return NextResponse.json({ error: "Conversation not found or update failed." }, { status: 404 });
    }

    return NextResponse.json({ conversation: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to rename conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/conversations/[id] — Delete a conversation and its messages */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Delete messages first (FK constraint)
    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

