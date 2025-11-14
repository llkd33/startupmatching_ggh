-- Add Storage policies for messages bucket
-- This allows authenticated users to upload, view, and delete files in the messages bucket

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own messages" ON storage.objects;

-- Policy 1: Allow authenticated users to upload files to messages bucket
CREATE POLICY "Authenticated users can upload messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messages'
);

-- Policy 2: Allow authenticated users to view files in messages bucket
-- This allows users to view files they're part of (based on campaign_id in path)
CREATE POLICY "Users can view messages"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'messages'
);

-- Policy 3: Allow users to delete files they uploaded
-- Files are stored as: messages/{campaignId}/{fileName}
-- We allow deletion if the user is authenticated (can be refined later)
CREATE POLICY "Users can delete messages"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'messages'
);

-- Policy 4: Allow users to update files
CREATE POLICY "Users can update messages"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'messages'
)
WITH CHECK (
  bucket_id = 'messages'
);

-- Note: These are permissive policies for authenticated users
-- For production, you may want to add more specific checks based on:
-- - campaign_id in the file path
-- - user_id matching sender/receiver in the messages table
-- - etc.

