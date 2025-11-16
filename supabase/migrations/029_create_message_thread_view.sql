-- Create message_thread_view for message threads with last message info
-- This view aggregates message thread data with participant info and last message
-- NOTE: This migration depends on:
--   027_add_campaign_id_to_messages.sql (messages 테이블에 campaign_id 추가)
--   028_create_message_threads_table.sql (message_threads 테이블 생성)

-- Drop view if exists
DROP VIEW IF EXISTS public.message_thread_view;

-- Create message_thread_view
CREATE VIEW public.message_thread_view AS
SELECT 
    mt.id,
    mt.campaign_id,
    mt.proposal_id,
    mt.participant_1,
    mt.participant_2,
    mt.last_message_at,
    mt.created_at,
    u1.email as participant_1_email,
    u2.email as participant_2_email,
    ep1.name as participant_1_name,
    ep2.name as participant_2_name,
    op1.organization_name as participant_1_org_name,
    op2.organization_name as participant_2_org_name,
    c.title as campaign_title,
    last_msg.content as last_message_content,
    last_msg.created_at as last_message_time,
    -- Unread count will be calculated separately per user (cannot use auth.uid() in view)
    0 as unread_count
FROM public.message_threads mt
JOIN public.users u1 ON mt.participant_1 = u1.id
JOIN public.users u2 ON mt.participant_2 = u2.id
LEFT JOIN public.expert_profiles ep1 ON u1.id = ep1.user_id
LEFT JOIN public.expert_profiles ep2 ON u2.id = ep2.user_id
LEFT JOIN public.organization_profiles op1 ON u1.id = op1.user_id
LEFT JOIN public.organization_profiles op2 ON u2.id = op2.user_id
LEFT JOIN public.campaigns c ON mt.campaign_id = c.id
LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM public.messages m
    WHERE (
        -- Match by participants
        (m.sender_id = mt.participant_1 AND m.receiver_id = mt.participant_2)
         OR (m.sender_id = mt.participant_2 AND m.receiver_id = mt.participant_1)
    )
    -- Match by campaign_id if both exist, otherwise match all messages between participants
    AND (
        (mt.campaign_id IS NOT NULL AND m.campaign_id = mt.campaign_id)
        OR (mt.campaign_id IS NULL AND (m.campaign_id IS NULL OR m.campaign_id IS NOT NULL))
    )
    ORDER BY created_at DESC
    LIMIT 1
) last_msg ON true;

-- Enable RLS on the view (views inherit RLS from underlying tables)
-- Grant SELECT permission
GRANT SELECT ON public.message_thread_view TO authenticated;
GRANT SELECT ON public.message_thread_view TO anon;

-- Add comment
COMMENT ON VIEW public.message_thread_view IS 
  'View showing message threads with participant info and last message. 
   Unread count should be calculated separately per user.';

DO $$ 
BEGIN
    RAISE NOTICE '✅ message_thread_view created successfully';
END $$;

