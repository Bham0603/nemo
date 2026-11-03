-- RECALL Database Architecture: Initial Schema & Security Policies
-- Migration: 20261102000000_initial_schema.sql

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- Helper Functions & Triggers
-- ====================================================================

-- Trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ====================================================================
-- 1. PROFILES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'Member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 2. COLLECTIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_collections_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);

CREATE TRIGGER tr_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 3. SOURCES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_name text,
  file_type text,
  mime_type text,
  file_size bigint,
  storage_path text,
  external_url text,
  processing_status text NOT NULL DEFAULT 'ready' CHECK (processing_status IN ('ready', 'processing', 'failed')),
  page_count integer,
  word_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_user_id ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_collection_id ON public.sources(collection_id);
CREATE INDEX IF NOT EXISTS idx_sources_status ON public.sources(processing_status);

CREATE TRIGGER tr_sources_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 4. NOTES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id_date ON public.notes(user_id, note_date DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON public.notes USING GIN (tags);

CREATE TRIGGER tr_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 5. CONVERSATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  conversation_mode text NOT NULL DEFAULT 'context' CHECK (conversation_mode IN ('context', 'regular')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON public.conversations(user_id, updated_at DESC);

CREATE TRIGGER tr_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 6. MESSAGES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- ====================================================================
-- 7. MEMORIES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('preference', 'interest', 'project', 'fact', 'goal', 'custom')),
  approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_user_approval ON public.memories(user_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_memories_category ON public.memories(category);

CREATE TRIGGER tr_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 8. CONCEPT_NODES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.concept_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  node_type text NOT NULL CHECK (node_type IN ('concept', 'document', 'note')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_nodes_user_id ON public.concept_nodes(user_id);

-- ====================================================================
-- 9. CONCEPT_EDGES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.concept_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_concept_edge UNIQUE (user_id, source_node_id, target_node_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_concept_edges_user_id ON public.concept_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_source ON public.concept_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_target ON public.concept_edges(target_node_id);

-- ====================================================================
-- 10. RESEARCH_RUNS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  summary text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_runs_user_created ON public.research_runs(user_id, created_at DESC);

-- ====================================================================
-- 11. MEETING_PREPS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.meeting_preps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_preps_user_date ON public.meeting_preps(user_id, meeting_date DESC);

CREATE TRIGGER tr_meeting_preps_updated_at
  BEFORE UPDATE ON public.meeting_preps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 12. USER_PREFERENCES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance text NOT NULL DEFAULT 'dark' CHECK (appearance IN ('dark', 'light', 'system')),
  density text NOT NULL DEFAULT 'comfortable' CHECK (density IN ('comfortable', 'compact')),
  ai_preferences jsonb NOT NULL DEFAULT '{"defaultModel": "Recall Balanced", "responseLength": "balanced", "alwaysCite": true, "showConfidence": true, "contextChunks": 8, "temperature": 0.3}'::jsonb,
  memory_preferences jsonb NOT NULL DEFAULT '{"memoryEnabled": true, "requireApproval": true, "autoExpireDays": 90}'::jsonb,
  privacy_preferences jsonb NOT NULL DEFAULT '{"analytics": false, "trainingOptOut": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- Auto-create Profile & Preferences on Auth Signup
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'Member')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name);

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- 2. Collections RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select_own" ON public.collections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "collections_insert_own" ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_update_own" ON public.collections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_delete_own" ON public.collections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Sources RLS
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources_select_own" ON public.sources
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "sources_insert_own" ON public.sources
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sources_update_own" ON public.sources
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sources_delete_own" ON public.sources
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Notes RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_own" ON public.notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notes_insert_own" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update_own" ON public.notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete_own" ON public.notes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Conversations RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own" ON public.conversations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6. Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 7. Memories RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_select_own" ON public.memories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "memories_insert_own" ON public.memories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memories_update_own" ON public.memories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memories_delete_own" ON public.memories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 8. Concept Nodes RLS
ALTER TABLE public.concept_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_nodes_select_own" ON public.concept_nodes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "concept_nodes_insert_own" ON public.concept_nodes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concept_nodes_update_own" ON public.concept_nodes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concept_nodes_delete_own" ON public.concept_nodes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 9. Concept Edges RLS
ALTER TABLE public.concept_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_edges_select_own" ON public.concept_edges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "concept_edges_insert_own" ON public.concept_edges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concept_edges_update_own" ON public.concept_edges
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concept_edges_delete_own" ON public.concept_edges
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 10. Research Runs RLS
ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "research_runs_select_own" ON public.research_runs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "research_runs_insert_own" ON public.research_runs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "research_runs_update_own" ON public.research_runs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "research_runs_delete_own" ON public.research_runs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 11. Meeting Preps RLS
ALTER TABLE public.meeting_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_preps_select_own" ON public.meeting_preps
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "meeting_preps_insert_own" ON public.meeting_preps
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meeting_preps_update_own" ON public.meeting_preps
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meeting_preps_delete_own" ON public.meeting_preps
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 12. User Preferences RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete_own" ON public.user_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

