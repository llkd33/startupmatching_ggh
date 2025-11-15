-- Add Storage policies for messages bucket
-- This allows authenticated users to upload, view, and delete files in the messages bucket
-- Files are stored as: messages/{campaignId}/{fileName}

-- Helper function to check if user is a participant in a campaign
-- Checks organization ownership, proposal submission, or message participation
-- Order matters: organization/proposal checks first (for first-time file uploads)
CREATE OR REPLACE FUNCTION public.is_campaign_participant(p_campaign_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- First check: Is user the organization owner of this campaign?
  -- This allows file uploads even before first message is sent
  IF EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.organization_profiles op ON c.organization_id = op.id
    WHERE c.id = p_campaign_id
      AND op.user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Second check: Has user submitted a proposal for this campaign?
  -- This allows experts to upload files even before first message
  IF EXISTS (
    SELECT 1
    FROM public.proposals p
    JOIN public.expert_profiles ep ON p.expert_id = ep.id
    WHERE p.campaign_id = p_campaign_id
      AND ep.user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Third check: Has user sent or received messages in this campaign?
  -- This covers ongoing conversations
  IF EXISTS (
    SELECT 1
    FROM public.messages
    WHERE campaign_id = p_campaign_id
      AND (sender_id = p_user_id OR receiver_id = p_user_id)
    LIMIT 1
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own messages" ON storage.objects;

-- Policy 1: Allow authenticated users to upload files to messages bucket
-- Only if they are participants in the campaign (extracted from path)
CREATE POLICY "Authenticated users can upload messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_campaign_participant(
    (storage.foldername(name))[1]::UUID,
    auth.uid()
  )
);

-- Policy 2: Allow authenticated users to view files in messages bucket
-- Only if they are participants in the campaign (extracted from path)
CREATE POLICY "Users can view messages"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_campaign_participant(
    (storage.foldername(name))[1]::UUID,
    auth.uid()
  )
);

-- Policy 3: Allow users to delete files they uploaded
-- Only if they are participants in the campaign
CREATE POLICY "Users can delete messages"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_campaign_participant(
    (storage.foldername(name))[1]::UUID,
    auth.uid()
  )
);

-- Policy 4: Allow users to update files
-- Only if they are participants in the campaign
CREATE POLICY "Users can update messages"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_campaign_participant(
    (storage.foldername(name))[1]::UUID,
    auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_campaign_participant(
    (storage.foldername(name))[1]::UUID,
    auth.uid()
  )
);


