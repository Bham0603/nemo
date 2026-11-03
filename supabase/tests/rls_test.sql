-- RECALL SQL Security & RLS Policy Isolation Tests
-- File: supabase/tests/rls_test.sql
-- Description: Validates cross-user data isolation and RLS policies

BEGIN;

-- Setup test users in auth.users
DO $$
DECLARE
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_source_a uuid;
  v_note_a uuid;
  v_count integer;
BEGIN
  RAISE NOTICE '=== Running RECALL RLS Policy Isolation Tests ===';

  -- 1. Test Setup: Create simulated auth records if testing locally
  -- Note: In production Supabase, users are created through auth.signUp()
  
  -- 2. Test User A Context (auth.uid() = User A)
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Insert profile for User A
  INSERT INTO public.profiles (id, display_name, email, role)
  VALUES (v_user_a, 'User A', 'usera@recall.test', 'Researcher')
  ON CONFLICT (id) DO NOTHING;

  -- Insert source for User A
  INSERT INTO public.sources (user_id, title, processing_status)
  VALUES (v_user_a, 'Transformer Architecture Test', 'ready')
  RETURNING id INTO v_source_a;

  -- Insert note for User A
  INSERT INTO public.notes (user_id, title, content)
  VALUES (v_user_a, 'Note by User A', 'Testing RLS isolation')
  RETURNING id INTO v_note_a;

  -- Verify User A can read their own records
  SELECT COUNT(*) INTO v_count FROM public.sources WHERE user_id = v_user_a;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: User A cannot read their own source';
  END IF;

  -- 3. Switch Context to User B (auth.uid() = User B)
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Verify User B CANNOT read User A's sources
  SELECT COUNT(*) INTO v_count FROM public.sources WHERE id = v_source_a;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B can read User A source!';
  ELSE
    RAISE NOTICE 'PASS: User B cannot select User A sources.';
  END IF;

  -- Verify User B CANNOT read User A's notes
  SELECT COUNT(*) INTO v_count FROM public.notes WHERE id = v_note_a;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B can read User A notes!';
  ELSE
    RAISE NOTICE 'PASS: User B cannot select User A notes.';
  END IF;

  -- Verify User B CANNOT update User A's note
  UPDATE public.notes SET title = 'Hacked by User B' WHERE id = v_note_a;
  
  -- Switch back to User A to ensure note was NOT modified
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SELECT COUNT(*) INTO v_count FROM public.notes WHERE id = v_note_a AND title = 'Hacked by User B';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B updated User A note!';
  ELSE
    RAISE NOTICE 'PASS: User B cannot update User A notes.';
  END IF;

  -- Verify User B CANNOT delete User A's note
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  DELETE FROM public.notes WHERE id = v_note_a;
  
  -- Switch back to User A to ensure note still exists
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SELECT COUNT(*) INTO v_count FROM public.notes WHERE id = v_note_a;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B deleted User A note!';
  ELSE
    RAISE NOTICE 'PASS: User B cannot delete User A notes.';
  END IF;

  RAISE NOTICE '=== ALL RLS POLICY TESTS PASSED SUCCESSFULLY ===';
END $$;

ROLLBACK;

