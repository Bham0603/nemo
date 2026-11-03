-- RECALL Database Architecture: Knowledge Chunks & Ingestion Enhancements
-- Migration: 20261103000000_knowledge_chunks.sql

-- ====================================================================
-- 1. ENHANCE SOURCES TABLE
-- ====================================================================
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ====================================================================
-- 2. KNOWLEDGE CHUNKS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.sources(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  page_number integer CHECK (page_number IS NULL OR page_number >= 1),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Target constraint: exactly one of source_id or note_id must be populated
  CONSTRAINT check_chunk_parent_target CHECK (
    (source_id IS NOT NULL AND note_id IS NULL) OR
    (source_id IS NULL AND note_id IS NOT NULL)
  )
);

-- Indexes for performant filtering and joins
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id
  ON public.knowledge_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_id_idx
  ON public.knowledge_chunks(source_id, chunk_index)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_note_id_idx
  ON public.knowledge_chunks(note_id, chunk_index)
  WHERE note_id IS NOT NULL;

-- Unique chunk ordering constraints per document/note
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_source_chunk_index
  ON public.knowledge_chunks (source_id, chunk_index)
  WHERE source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_note_chunk_index
  ON public.knowledge_chunks (note_id, chunk_index)
  WHERE note_id IS NOT NULL;

-- ====================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can only read their own chunks
CREATE POLICY "knowledge_chunks_select_policy"
  ON public.knowledge_chunks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy: Users can only insert chunks for themselves
CREATE POLICY "knowledge_chunks_insert_policy"
  ON public.knowledge_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only update their own chunks
CREATE POLICY "knowledge_chunks_update_policy"
  ON public.knowledge_chunks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can only delete their own chunks
CREATE POLICY "knowledge_chunks_delete_policy"
  ON public.knowledge_chunks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

