-- Quick setup script for messages storage policies
-- Run this in Supabase SQL Editor

-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages');

-- Allow authenticated users to view files
CREATE POLICY IF NOT EXISTS "Users can view messages"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'messages');

-- Allow authenticated users to delete files
CREATE POLICY IF NOT EXISTS "Users can delete messages"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messages');

-- Allow authenticated users to update files
CREATE POLICY IF NOT EXISTS "Users can update messages"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'messages')
WITH CHECK (bucket_id = 'messages');

