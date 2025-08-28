-- ============================================
-- Fix Missing Database Functions
-- ============================================
-- This SQL fixes all missing RPC functions that are causing 404 errors
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Notification Functions
-- ============================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    -- Return 0 if no user
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count unread notifications
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.notifications
    WHERE user_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE id = notification_id
    AND user_id = auth.uid();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
    AND is_read = false;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Message Functions
-- ============================================

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    -- Return 0 if no user
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count unread messages
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.messages
    WHERE receiver_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message (for connection-based messaging)
CREATE OR REPLACE FUNCTION send_message(
    p_campaign_id UUID DEFAULT NULL,
    p_proposal_id UUID DEFAULT NULL,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $
DECLARE
    message_id UUID;
    connection_id UUID;
BEGIN
    -- For the current schema, we need to find the connection_id
    -- This assumes messages are tied to connection_requests
    IF p_campaign_id IS NOT NULL THEN
        -- Try to find a connection request that matches
        SELECT cr.id INTO connection_id
        FROM public.connection_requests cr
        JOIN public.organization_profiles op ON cr.organization_id = op.id
        JOIN public.expert_profiles ep ON cr.expert_id = ep.id
        WHERE cr.status = 'approved'
        AND ((op.user_id = p_sender_id AND ep.user_id = p_receiver_id)
             OR (ep.user_id = p_sender_id AND op.user_id = p_receiver_id))
        LIMIT 1;
    END IF;
    
    -- If no connection found, create a basic message entry
    -- Note: This might need adjustment based on your actual message schema
    INSERT INTO public.messages (
        connection_id, sender_id, receiver_id, content
    ) VALUES (
        connection_id, p_sender_id, p_receiver_id, p_content
    ) RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Expert Functions
-- ============================================

-- Function to update expert hashtags
CREATE OR REPLACE FUNCTION update_expert_hashtags(p_expert_id UUID)
RETURNS VOID AS $
BEGIN
    -- This function can be used to recalculate or update hashtags
    -- For now, it's a placeholder that ensures the function exists
    -- You can add specific hashtag update logic here
    UPDATE public.expert_profiles
    SET updated_at = NOW()
    WHERE id = p_expert_id
    AND user_id = auth.uid();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Campaign Matching Functions
-- ============================================

-- Function to match campaign experts
CREATE OR REPLACE FUNCTION match_campaign_experts(
    p_campaign_id UUID,
    p_stage INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    expert_id UUID,
    user_id UUID,
    name TEXT,
    skills TEXT[],
    hashtags TEXT[],
    bio TEXT,
    hourly_rate INTEGER,
    rating DECIMAL(3,2),
    total_projects INTEGER,
    match_score INTEGER
) AS $
BEGIN
    -- Basic expert matching based on availability and profile completion
    -- This is a simplified version - you can enhance with more sophisticated matching
    RETURN QUERY
    SELECT 
        ep.id as expert_id,
        ep.user_id,
        ep.name,
        ep.skills,
        ep.hashtags,
        ep.bio,
        ep.hourly_rate,
        ep.rating,
        ep.total_projects,
        -- Simple match score based on profile completeness and availability
        CASE 
            WHEN ep.is_profile_complete AND ep.is_available THEN 100
            WHEN ep.is_available THEN 75
            ELSE 50
        END as match_score
    FROM public.expert_profiles ep
    WHERE ep.is_available = true
    AND ep.is_profile_complete = true
    ORDER BY match_score DESC, ep.rating DESC
    LIMIT p_limit;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION update_expert_hashtags TO authenticated;
GRANT EXECUTE ON FUNCTION match_campaign_experts TO authenticated;

-- ============================================
-- 6. Test Functions
-- ============================================

-- Test that all functions work
SELECT 
    'All functions created successfully!' as status,
    get_unread_notification_count() as notification_count,
    get_unread_message_count() as message_count;

-- List all created functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_unread_notification_count',
    'get_unread_message_count', 
    'mark_notification_read',
    'mark_all_notifications_read',
    'send_message',
    'update_expert_hashtags',
    'match_campaign_experts'
)
ORDER BY routine_name;