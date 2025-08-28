-- Add is_admin flag to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin users
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for admin access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
    OR id = auth.uid()
  );

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
    OR id = auth.uid()
  );

-- Admin logs policies
CREATE POLICY "Admins can insert logs" ON admin_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

CREATE POLICY "Admins can read logs" ON admin_logs
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Grant admin access to all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  LOOP
    -- Create policy for admin read access if not exists
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "Admin read access %I" ON %I
      FOR SELECT
      USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE))',
      t, t);
    
    -- Create policy for admin write access if not exists
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "Admin write access %I" ON %I
      FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE))',
      t, t);
  END LOOP;
END $$;

-- Create function to make a user admin (can only be called by existing admin)
CREATE OR REPLACE FUNCTION make_user_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_caller_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO is_caller_admin
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Only admins can make other users admin';
  END IF;
  
  -- Make target user admin
  UPDATE profiles
  SET is_admin = TRUE
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'GRANT_ADMIN', 'user', target_user_id, jsonb_build_object('granted_at', NOW()));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke admin privileges
CREATE OR REPLACE FUNCTION revoke_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_caller_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO is_caller_admin
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Only admins can revoke admin privileges';
  END IF;
  
  -- Prevent removing last admin
  IF (SELECT COUNT(*) FROM profiles WHERE is_admin = TRUE) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin';
  END IF;
  
  -- Revoke admin privileges
  UPDATE profiles
  SET is_admin = FALSE
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'REVOKE_ADMIN', 'user', target_user_id, jsonb_build_object('revoked_at', NOW()));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial super admin account
-- Email: admin@startupmatching.com
-- Password: Admin123!@# (should be changed immediately)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@startupmatching.com') THEN
    -- Note: This is for documentation. The actual user should be created via Supabase Auth
    -- or using the Supabase dashboard with the following credentials:
    -- Email: admin@startupmatching.com
    -- Password: Admin123!@# (change immediately after first login)
    
    -- After creating the user in Supabase Auth, run this to make them admin:
    -- UPDATE profiles SET is_admin = TRUE WHERE email = 'admin@startupmatching.com';
    
    RAISE NOTICE 'Please create admin user via Supabase Auth Dashboard with email: admin@startupmatching.com';
  END IF;
END $$;

-- Create view for admin statistics
CREATE OR REPLACE VIEW admin_statistics AS
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'expert') as total_experts,
  (SELECT COUNT(*) FROM profiles WHERE role = 'organization') as total_organizations,
  (SELECT COUNT(*) FROM profiles WHERE is_admin = TRUE) as total_admins,
  (SELECT COUNT(*) FROM campaigns) as total_campaigns,
  (SELECT COUNT(*) FROM campaigns WHERE status = 'active') as active_campaigns,
  (SELECT COUNT(*) FROM proposals) as total_proposals,
  (SELECT COUNT(*) FROM proposals WHERE status = 'accepted') as accepted_proposals,
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(DISTINCT sender_id) FROM messages WHERE created_at > NOW() - INTERVAL '7 days') as active_users_week,
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month;

-- Grant access to admin statistics view
GRANT SELECT ON admin_statistics TO authenticated;