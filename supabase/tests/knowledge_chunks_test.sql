-- RECALL Step 5: Knowledge Chunks RLS Policy Isolation Tests
-- File: supabase/tests/knowledge_chunks_test.sql
-- Description: Validates user isolation on public.knowledge_chunks

BEGIN;

DO $$
DECLARE
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_source_a uuid;
  v_chunk_a uuid;
  v_count integer;
BEGIN
  RAISE NOTICE '=== Running Knowledge Chunks RLS Isolation Tests ===';

  -- 1. Context: User A
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Create source for User A
  INSERT INTO public.sources (user_id, title, processing_status)
  VALUES (v_user_a, 'Knowledge Chunks Test Document', 'ready')
  RETURNING id INTO v_source_a;

  -- Insert chunk for User A
  INSERT INTO public.knowledge_chunks (user_id, source_id, chunk_index, content, page_number)
  VALUES (v_user_a, v_source_a, 0, 'Self-attention mechanism and transformer embeddings chunk 0', 1)
  RETURNING id INTO v_chunk_a;

  -- Assert User A can select their chunk
  SELECT COUNT(*) INTO v_count FROM public.knowledge_chunks WHERE id = v_chunk_a;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: User A cannot read their own knowledge chunk';
  END IF;
  RAISE NOTICE '  ✓ PASS: User A can read their own knowledge chunks';

  -- 2. Context: Switch to User B
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Assert User B CANNOT select User A's chunk
  SELECT COUNT(*) INTO v_count FROM public.knowledge_chunks WHERE id = v_chunk_a;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B can read User A knowledge chunk!';
  END IF;
  RAISE NOTICE '  ✓ PASS: User B cannot read User A knowledge chunks (RLS verified)';

  -- Assert User B CANNOT update User A's chunk
  UPDATE public.knowledge_chunks
  SET content = 'Hacked content'
  WHERE id = v_chunk_a;

  -- Check if content was modified
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SELECT content INTO v_count FROM public.knowledge_chunks WHERE id = v_chunk_a AND content = 'Hacked content';
  IF FOUND THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B modified User A knowledge chunk!';
  END IF;
  RAISE NOTICE '  ✓ PASS: User B cannot update User A knowledge chunks';

  -- Assert User B CANNOT delete User A's chunk
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  DELETE FROM public.knowledge_chunks WHERE id = v_chunk_a;

  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SELECT COUNT(*) INTO v_count FROM public.knowledge_chunks WHERE id = v_chunk_a;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B deleted User A knowledge chunk!';
  END IF;
  RAISE NOTICE '  ✓ PASS: User B cannot delete User A knowledge chunks';

  RAISE NOTICE '=== ALL KNOWLEDGE CHUNKS RLS TESTS PASSED SUCCESSFULLY ===';
END $$;

ROLLBACK;

