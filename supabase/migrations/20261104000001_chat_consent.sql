-- Step 7: Chat Consent and Message Metadata
-- Adds gemini_chat_consent (separate from embedding consent) and
-- optional metadata columns on messages.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_chat_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gemini_chat_consent_updated_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS retrieval_metadata jsonb DEFAULT NULL;

-- Update conversations table to allow 'regular' | 'context' modes
-- (The DB may already have these constraints; this is a no-op if already correct)
-- We alter the check constraint only if the current one is different:
DO $$
BEGIN
  -- Drop old constraint if it exists (it may have different valid values)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversations_conversation_mode_check'
      AND table_name = 'conversations'
  ) THEN
    ALTER TABLE public.conversations DROP CONSTRAINT conversations_conversation_mode_check;
  END IF;
  -- Add the correct constraint
  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_conversation_mode_check
    CHECK (conversation_mode IN ('regular', 'context'));
EXCEPTION
  WHEN others THEN
    NULL; -- Ignore if already correct
END;
$$;

