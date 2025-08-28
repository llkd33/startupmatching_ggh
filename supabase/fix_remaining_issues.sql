-- ============================================
-- Fix Remaining Database Issues
-- ============================================
-- This SQL fixes the remaining issues found by the test script
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Fix Messages Table Structure
-- ============================================

-- Add missing columns to messages table
DO $$
BEGIN
    -- Add campaign_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'campaign_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
    END IF;
    
    -- Add proposal_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'proposal_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON public.messages(proposal_id);
    END IF;
    
    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system'));
    END IF;
    
    -- Add read_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'read_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Add trigger for updated_at
        CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 2. Create Missing Functions
-- ============================================

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.messages
    WHERE receiver_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message
CREATE OR REPLACE FUNCTION send_message(
    p_campaign_id UUID,
    p_proposal_id UUID DEFAULT NULL,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $
DECLARE
    message_id UUID;
BEGIN
    INSERT INTO public.messages (
        campaign_id, proposal_id, sender_id, receiver_id, content, message_type
    ) VALUES (
        p_campaign_id, p_proposal_id, p_sender_id, p_receiver_id, p_content, p_message_type
    ) RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

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
    RETURN QUERY
    SELECT 
        ep.id as expert_id,
        ep.user_id,
        ep.name,
        ep.skills,
        ep.hashtags,
        ep.bio,
        ep.hourly_rate::INTEGER,
        ep.rating,
        ep.total_projects,
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
-- 3. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION match_campaign_experts TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;

-- ============================================
-- 4. Test the Fix
-- ============================================

-- Test that all functions work
SELECT 
    'Remaining issues fixed successfully!' as status,
    get_unread_notification_count() as notification_count,
    get_unread_message_count() as message_count;

-- Verify functions exist
SELECT 
    routine_name,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_unread_message_count', 
    'send_message',
    'match_campaign_experts',
    'mark_notification_read',
    'mark_all_notifications_read'
)
ORDER BY routine_name;