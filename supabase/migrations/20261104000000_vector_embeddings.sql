-- RECALL Database Architecture: Google Gemini Embeddings & Semantic Search
-- Migration: 20261104000000_vector_embeddings.sql

-- ====================================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ====================================================================
-- Supabase hosts pgvector in the 'extensions' schema by default.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ====================================================================
-- 2. USER PRIVACY & GEMINI EMBEDDING CONSENT
-- ====================================================================
-- Adds explicit opt-in consent tracking for external Google Gemini embeddings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_embedding_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gemini_consent_updated_at timestamptz;

-- ====================================================================
-- 3. ADD EMBEDDING COLUMNS TO KNOWLEDGE CHUNKS
-- ====================================================================
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedding_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS embedding_error text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_hash text;

-- Add check constraint for embedding_status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_knowledge_chunks_embedding_status'
  ) THEN
    ALTER TABLE public.knowledge_chunks
      ADD CONSTRAINT check_knowledge_chunks_embedding_status
      CHECK (embedding_status IN ('pending', 'processing', 'ready', 'failed'));
  END IF;
END $$;

-- Purge any incompatible vectors (e.g., previous experimental models) to avoid vector space pollution
UPDATE public.knowledge_chunks
  SET embedding = NULL,
      embedding_model = NULL,
      embedding_status = 'pending',
      content_hash = NULL
  WHERE embedding_model IS NOT NULL AND embedding_model != 'gemini-embedding-2';

-- ====================================================================
-- 4. INDEXES FOR EMBEDDINGS AND STATUS
-- ====================================================================
-- HNSW index using cosine distance (vector_cosine_ops) for sub-millisecond retrieval.
-- Partial index only indexes non-null embeddings.
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
  ON public.knowledge_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Index for querying pending/processing chunks during backfills
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_embedding_status
  ON public.knowledge_chunks(user_id, embedding_status);

-- Index on content_hash to facilitate deduplication and skip unchanged embeddings
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_hash
  ON public.knowledge_chunks(user_id, content_hash);

-- ====================================================================
-- 5. SECURE SEMANTIC SEARCH RPC FUNCTION
-- ====================================================================
-- Searches chunks by cosine distance against a 1536-dim query vector.
-- STRICT SECURITY:
--   - Uses SECURITY INVOKER
--   - Scoped strictly to auth.uid()
--   - Uses the distance operator <=> directly in ORDER BY to leverage HNSW
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_count integer DEFAULT 10,
  match_threshold double precision DEFAULT 0.35,
  filter_collection_id uuid DEFAULT NULL,
  filter_source_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  source_id uuid,
  note_id uuid,
  content text,
  chunk_index integer,
  page_number integer,
  source_title text,
  source_type text,
  collection_id uuid,
  collection_name text,
  note_title text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id AS chunk_id,
    kc.source_id,
    kc.note_id,
    kc.content,
    kc.chunk_index,
    kc.page_number,
    s.title AS source_title,
    s.file_type AS source_type,
    c.id AS collection_id,
    c.name AS collection_name,
    n.title AS note_title,
    (1.0 - (kc.embedding <=> query_embedding)) AS similarity
  FROM public.knowledge_chunks kc
  LEFT JOIN public.sources s
    ON kc.source_id = s.id AND s.user_id = auth.uid()
  LEFT JOIN public.collections c
    ON s.collection_id = c.id AND c.user_id = auth.uid()
  LEFT JOIN public.notes n
    ON kc.note_id = n.id AND n.user_id = auth.uid()
  WHERE
    kc.user_id = auth.uid()
    AND kc.embedding IS NOT NULL
    AND (1.0 - (kc.embedding <=> query_embedding)) >= match_threshold
    AND (filter_source_id IS NULL OR kc.source_id = filter_source_id)
    AND (filter_collection_id IS NULL OR s.collection_id = filter_collection_id)
  ORDER BY
    kc.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Revoke execute from public and grant strictly to authenticated users
REVOKE ALL ON FUNCTION public.search_knowledge_chunks(extensions.vector, integer, double precision, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks(extensions.vector, integer, double precision, uuid, uuid) TO authenticated;
