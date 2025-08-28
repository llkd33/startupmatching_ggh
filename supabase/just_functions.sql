-- ============================================
-- ONLY Missing Functions - No Policies
-- ============================================
-- This only creates the missing RPC functions causing 404 errors

-- Function to get unread notification count (fixing the 404 error)
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
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
    FROM public.notifications
    WHERE user_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;

-- Test it works
SELECT 'Function created!' as status, get_unread_notification_count() as count;