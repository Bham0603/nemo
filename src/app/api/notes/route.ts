import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestNote } from "@/lib/ingest/pipeline";

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

    const { data: notes, error } = await supabase
      .from("notes")
      .select("id, title, content, note_date, tags, created_at, updated_at")
      .eq("user_id", user.id)
      .order("note_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Map to frontend Note interface
    const mapped = (notes || []).map((n) => ({
      id: n.id,
      date: n.note_date,
      title: n.title,
      body: n.content,
      tags: n.tags || [],
    }));

    return NextResponse.json({ notes: mapped });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load notes";
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
        { status: 401 },
      );
    }

    const body = await req.json();
    const { id, title, content = "", noteDate, tags = [] } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Note title is required." },
        { status: 400 },
      );
    }

    const result = await ingestNote({
      userId: user.id,
      noteId: id,
      title: title.trim(),
      content: content.trim(),
      noteDate,
      tags,
      supabase,
    });

    return NextResponse.json({
      success: true,
      note: {
        id: result.note.id,
        date: result.note.note_date,
        title: result.note.title,
        body: result.note.content,
        tags: result.note.tags,
      },
      chunksCount: result.chunksCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save note";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

