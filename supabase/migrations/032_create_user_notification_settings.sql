-- Create user_notification_settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Master toggle
    email_notifications BOOLEAN DEFAULT true,

    -- Activity notifications
    connection_request_email BOOLEAN DEFAULT true,
    request_approved_email BOOLEAN DEFAULT true,
    request_rejected_email BOOLEAN DEFAULT true,

    -- Proposal notifications
    new_proposal_email BOOLEAN DEFAULT true,
    proposal_accepted_email BOOLEAN DEFAULT true,
    proposal_rejected_email BOOLEAN DEFAULT true,

    -- Message notifications
    new_message_email BOOLEAN DEFAULT true,

    -- Campaign notifications
    campaign_deadline_email BOOLEAN DEFAULT true,
    campaign_status_email BOOLEAN DEFAULT true,

    -- Task notifications
    task_assigned_email BOOLEAN DEFAULT true,
    task_deadline_email BOOLEAN DEFAULT true,

    -- Marketing
    marketing_email BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on user_id
    UNIQUE(user_id)
);

-- Add comment for documentation
COMMENT ON TABLE user_notification_settings IS 'Stores user email notification preferences';

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id
ON user_notification_settings(user_id);

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own settings
CREATE POLICY "Users can view own notification settings"
ON user_notification_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own notification settings"
ON user_notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own notification settings"
ON user_notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all settings
CREATE POLICY "Admins can view all notification settings"
ON user_notification_settings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

-- Create function to check notification preference before sending email
CREATE OR REPLACE FUNCTION check_notification_preference(
    p_user_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email_enabled BOOLEAN;
    v_specific_enabled BOOLEAN;
BEGIN
    -- Get user's notification settings
    SELECT
        email_notifications,
        CASE p_notification_type
            WHEN 'connection_request' THEN connection_request_email
            WHEN 'request_approved' THEN request_approved_email
            WHEN 'request_rejected' THEN request_rejected_email
            WHEN 'new_proposal' THEN new_proposal_email
            WHEN 'proposal_accepted' THEN proposal_accepted_email
            WHEN 'proposal_rejected' THEN proposal_rejected_email
            WHEN 'new_message' THEN new_message_email
            WHEN 'campaign_deadline' THEN campaign_deadline_email
            WHEN 'campaign_status' THEN campaign_status_email
            WHEN 'task_assigned' THEN task_assigned_email
            WHEN 'task_deadline' THEN task_deadline_email
            WHEN 'marketing' THEN marketing_email
            ELSE true
        END
    INTO v_email_enabled, v_specific_enabled
    FROM user_notification_settings
    WHERE user_id = p_user_id;

    -- If no settings found, default to true (except marketing)
    IF v_email_enabled IS NULL THEN
        RETURN p_notification_type != 'marketing';
    END IF;

    -- Return master toggle AND specific toggle
    RETURN v_email_enabled AND v_specific_enabled;
END;
$$;
