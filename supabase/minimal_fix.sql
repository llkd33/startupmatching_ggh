-- ============================================
-- Minimal Fix - Only Missing Functions and Policies
-- ============================================
-- Run this SQL in Supabase SQL Editor to fix only the errors

-- ============================================
-- 1. Create missing RPC functions (main issue)
-- ============================================

-- Function to get unread notification count (fixing the 404 error)
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Add missing messages policies (if they don't exist)
-- ============================================

-- Check and add messages policies only if they don't exist
DO $$
BEGIN
    -- Enable RLS on messages if not already enabled
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Add messages policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users can view their messages'
    ) THEN
        CREATE POLICY "Users can view their messages" ON public.messages
            FOR SELECT USING (
                auth.uid() = sender_id OR auth.uid() = receiver_id
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users can send messages'
    ) THEN
        CREATE POLICY "Users can send messages" ON public.messages
            FOR INSERT WITH CHECK (
                auth.uid() = sender_id
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users can update their received messages'
    ) THEN
        CREATE POLICY "Users can update their received messages" ON public.messages
            FOR UPDATE USING (
                auth.uid() = receiver_id
            );
    END IF;
END $$;

-- ============================================
-- 3. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;

-- ============================================
-- 4. Test the fix
-- ============================================

-- Test that the functions work
SELECT 'Fix applied successfully!' as status,
       get_unread_notification_count() as notification_count,
       get_unread_message_count() as message_count;