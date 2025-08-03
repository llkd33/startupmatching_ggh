-- Notifications Table
-- This table stores notifications for users including connection requests, campaign updates, etc.

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('connection_request', 'connection_approved', 'connection_rejected', 'campaign_match', 'profile_update', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entity information
  related_id UUID, -- ID of related entity (connection request, campaign, etc.)
  related_type TEXT, -- Type of related entity ('connection_request', 'campaign', 'expert_profile', etc.)
  
  -- Notification metadata
  action_url TEXT, -- URL to navigate to when notification is clicked
  action_text TEXT, -- Text for action button (e.g., "View Request", "See Details")
  
  -- Status tracking
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read/archived)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create a function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications 
    WHERE user_id = auth.uid() 
      AND is_read = FALSE 
      AND is_archived = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create connection request notification
CREATE OR REPLACE FUNCTION create_connection_request_notification(
  expert_user_id UUID,
  organization_name TEXT,
  connection_request_id UUID,
  subject TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    action_url,
    action_text
  ) VALUES (
    expert_user_id,
    'connection_request',
    '새로운 연결 요청',
    organization_name || '에서 협업 요청을 보내왔습니다: ' || subject,
    connection_request_id,
    'connection_request',
    '/dashboard/connection-requests/' || connection_request_id,
    '요청 확인'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create connection approval notification
CREATE OR REPLACE FUNCTION create_connection_approval_notification(
  organization_user_id UUID,
  expert_name TEXT,
  connection_request_id UUID,
  subject TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    action_url,
    action_text
  ) VALUES (
    organization_user_id,
    'connection_approved',
    '연결 요청이 승인되었습니다!',
    expert_name || ' 전문가가 협업 요청을 수락했습니다: ' || subject,
    connection_request_id,
    'connection_request',
    '/dashboard/connection-requests/' || connection_request_id,
    '연락처 확인'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create connection rejection notification
CREATE OR REPLACE FUNCTION create_connection_rejection_notification(
  organization_user_id UUID,
  expert_name TEXT,
  connection_request_id UUID,
  subject TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    action_url,
    action_text
  ) VALUES (
    organization_user_id,
    'connection_rejected',
    '연결 요청이 거절되었습니다',
    expert_name || ' 전문가가 협업 요청을 거절했습니다: ' || subject,
    connection_request_id,
    'connection_request',
    '/dashboard/connection-requests/' || connection_request_id,
    '요청 확인'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create notifications when connection requests are updated
CREATE OR REPLACE FUNCTION notify_connection_request_update()
RETURNS TRIGGER AS $$
DECLARE
  expert_user_id UUID;
  organization_user_id UUID;
  expert_name TEXT;
  organization_name TEXT;
BEGIN
  -- Get user IDs and names
  SELECT ep.user_id, ep.name INTO expert_user_id, expert_name
  FROM expert_profiles ep WHERE ep.id = NEW.expert_id;
  
  SELECT op.user_id, op.name INTO organization_user_id, organization_name
  FROM organization_profiles op WHERE op.id = NEW.organization_id;
  
  -- Create appropriate notifications based on status change
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- Notify organization that expert approved
    PERFORM create_connection_approval_notification(
      organization_user_id,
      expert_name,
      NEW.id,
      NEW.subject
    );
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    -- Notify organization that expert rejected
    PERFORM create_connection_rejection_notification(
      organization_user_id,
      expert_name,
      NEW.id,
      NEW.subject
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connection_request_notification_trigger
  AFTER UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_connection_request_update();

-- Create a trigger to create notification when new connection request is created
CREATE OR REPLACE FUNCTION notify_new_connection_request()
RETURNS TRIGGER AS $$
DECLARE
  expert_user_id UUID;
  organization_name TEXT;
BEGIN
  -- Get expert user ID
  SELECT ep.user_id INTO expert_user_id
  FROM expert_profiles ep WHERE ep.id = NEW.expert_id;
  
  -- Get organization name
  SELECT op.name INTO organization_name
  FROM organization_profiles op WHERE op.id = NEW.organization_id;
  
  -- Create notification for expert
  PERFORM create_connection_request_notification(
    expert_user_id,
    organization_name,
    NEW.id,
    NEW.subject
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_connection_request_notification_trigger
  AFTER INSERT ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_connection_request();