-- RECALL Storage Setup: Private Bucket & Isolation Policies
-- Migration: 20261102000001_storage_setup.sql

-- ====================================================================
-- 1. Create Private Storage Bucket: knowledge-files
-- ====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-files',
  'knowledge-files',
  false,
  52428800, -- 50 MB limit per file
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ];

-- ====================================================================
-- 2. Storage Objects RLS Policies
-- Storage Path Structure: knowledge-files/{user_id}/{source_id}/{file_name}
-- (storage.foldername(name))[1] evaluates to {user_id}
-- ====================================================================

-- Allow authenticated users to view only their own files
CREATE POLICY "knowledge_files_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload files only into their own user directory
CREATE POLICY "knowledge_files_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update only their own files
CREATE POLICY "knowledge_files_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete only their own files
CREATE POLICY "knowledge_files_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

