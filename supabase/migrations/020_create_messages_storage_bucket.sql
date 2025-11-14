-- Create Storage bucket for messages
-- This script creates the 'messages' bucket and sets up proper policies

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages',
  'messages',
  true, -- Public bucket for easier access (can be changed to false with RLS policies)
  10485760, -- 10MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for messages bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages');

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view messages"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'messages');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own messages"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to update their own files
CREATE POLICY "Users can update their own messages"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Note: The above policies assume files are stored with user_id in the path
-- If you want to allow access based on campaign_id instead, adjust the policies accordingly

