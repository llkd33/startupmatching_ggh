-- Migration to fix missing RPC functions and database errors
-- This ensures all required functions exist for proper app functionality

-- Drop existing functions if they exist to ensure clean state
DROP FUNCTION IF EXISTS get_unread_notification_count() CASCADE;
DROP FUNCTION IF EXISTS get_unread_message_count(UUID) CASCADE;

-- Create function to get unread notification count for current user
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return 0 if user is not authenticated
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT COUNT(*)::integer
    FROM notifications
    WHERE user_id = auth.uid()
      AND is_read = false
  ), 0);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 instead of failing
    RAISE WARNING 'Error in get_unread_notification_count: %', SQLERRM;
    RETURN 0;
END;
$$;

-- Create function to get unread message count for current user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Count unread messages efficiently
  SELECT COUNT(*)::integer INTO unread_count
  FROM messages m
  WHERE m.receiver_id = target_user_id
    AND m.is_read = false
    AND m.deleted_at IS NULL;

  RETURN COALESCE(unread_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 instead of failing
    RAISE WARNING 'Error in get_unread_message_count: %', SQLERRM;
    RETURN 0;
END;
$$;

-- Create helper function to get conversation summary
CREATE OR REPLACE FUNCTION get_conversation_summary(
  p_campaign_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_messages INTEGER,
  unread_messages INTEGER,
  last_message_at TIMESTAMPTZ,
  participants INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_messages,
    COUNT(*) FILTER (WHERE receiver_id = target_user_id AND is_read = false)::integer AS unread_messages,
    MAX(created_at) AS last_message_at,
    COUNT(DISTINCT CASE 
      WHEN sender_id = target_user_id THEN receiver_id 
      ELSE sender_id 
    END)::integer AS participants
  FROM messages
  WHERE campaign_id = p_campaign_id
    AND (sender_id = target_user_id OR receiver_id = target_user_id)
    AND deleted_at IS NULL;
END;
$$;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_campaign_id UUID,
  p_sender_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark messages as read
  WITH updated AS (
    UPDATE messages
    SET 
      is_read = true,
      read_at = CASE 
        WHEN read_at IS NULL THEN NOW() 
        ELSE read_at 
      END
    WHERE campaign_id = p_campaign_id
      AND receiver_id = auth.uid()
      AND is_read = false
      AND deleted_at IS NULL
      AND (p_sender_id IS NULL OR sender_id = p_sender_id)
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO updated_count FROM updated;

  RETURN COALESCE(updated_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in mark_messages_as_read: %', SQLERRM;
    RETURN 0;
END;
$$;

-- Create function to safely delete old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only allow admin users to run this
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Soft delete old read notifications
  WITH deleted AS (
    UPDATE notifications
    SET deleted_at = NOW()
    WHERE is_read = true
      AND created_at < NOW() - (days_old || ' days')::INTERVAL
      AND deleted_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO deleted_count FROM deleted;

  RETURN COALESCE(deleted_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in cleanup_old_notifications: %', SQLERRM;
    RETURN 0;
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications(INTEGER) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_unread_notification_count() IS 'Returns the count of unread notifications for the current authenticated user';
COMMENT ON FUNCTION get_unread_message_count(UUID) IS 'Returns the count of unread messages for a user (defaults to current user)';
COMMENT ON FUNCTION get_conversation_summary(UUID, UUID) IS 'Returns summary statistics for a conversation in a campaign';
COMMENT ON FUNCTION mark_messages_as_read(UUID, UUID) IS 'Marks messages as read for the current user in a campaign';
COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Admin function to clean up old read notifications';

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
  ON messages(receiver_id, is_read) 
  WHERE is_read = false AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_campaign_participants 
  ON messages(campaign_id, sender_id, receiver_id) 
  WHERE deleted_at IS NULL;

-- Add validation to ensure required columns exist
DO $$
BEGIN
  -- Check if notifications table has required columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'deleted_at') THEN
    ALTER TABLE notifications ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  -- Check if messages table has required columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' 
                 AND column_name = 'is_read') THEN
    ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' 
                 AND column_name = 'read_at') THEN
    ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' 
                 AND column_name = 'deleted_at') THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;