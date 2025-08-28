-- Admin system migration for existing database structure
-- This works with separate expert_profiles and organization_profiles tables

-- Add is_admin flag to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin users
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = TRUE;

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for admin access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Admin can read all users
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE)
    OR id = auth.uid()
  );

-- Admin can update all users
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE)
    OR id = auth.uid()
  );

-- Regular users can only read their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Regular users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = auth.uid());

-- Admin logs policies
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can read logs" ON public.admin_logs;

CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE)
  );

CREATE POLICY "Admins can read logs" ON public.admin_logs
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE)
  );

-- Grant admin access to all tables
-- Expert profiles
DROP POLICY IF EXISTS "Admin read access expert_profiles" ON public.expert_profiles;
DROP POLICY IF EXISTS "Admin write access expert_profiles" ON public.expert_profiles;

CREATE POLICY "Admin read access expert_profiles" ON public.expert_profiles
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "Admin write access expert_profiles" ON public.expert_profiles
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Organization profiles
DROP POLICY IF EXISTS "Admin read access organization_profiles" ON public.organization_profiles;
DROP POLICY IF EXISTS "Admin write access organization_profiles" ON public.organization_profiles;

CREATE POLICY "Admin read access organization_profiles" ON public.organization_profiles
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "Admin write access organization_profiles" ON public.organization_profiles
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Campaigns
DROP POLICY IF EXISTS "Admin read access campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admin write access campaigns" ON public.campaigns;

CREATE POLICY "Admin read access campaigns" ON public.campaigns
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "Admin write access campaigns" ON public.campaigns
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Proposals
DROP POLICY IF EXISTS "Admin read access proposals" ON public.proposals;
DROP POLICY IF EXISTS "Admin write access proposals" ON public.proposals;

CREATE POLICY "Admin read access proposals" ON public.proposals
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "Admin write access proposals" ON public.proposals
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Messages
DROP POLICY IF EXISTS "Admin read access messages" ON public.messages;
DROP POLICY IF EXISTS "Admin write access messages" ON public.messages;

CREATE POLICY "Admin read access messages" ON public.messages
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "Admin write access messages" ON public.messages
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Create function to make a user admin (can only be called by existing admin)
CREATE OR REPLACE FUNCTION make_user_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_caller_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO is_caller_admin
  FROM public.users
  WHERE id = auth.uid();
  
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Only admins can make other users admin';
  END IF;
  
  -- Make target user admin
  UPDATE public.users
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
  FROM public.users
  WHERE id = auth.uid();
  
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Only admins can revoke admin privileges';
  END IF;
  
  -- Prevent removing last admin
  IF (SELECT COUNT(*) FROM public.users WHERE is_admin = TRUE) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin';
  END IF;
  
  -- Revoke admin privileges
  UPDATE public.users
  SET is_admin = FALSE
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'REVOKE_ADMIN', 'user', target_user_id, jsonb_build_object('revoked_at', NOW()));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for admin statistics
CREATE OR REPLACE VIEW admin_statistics AS
SELECT 
  (SELECT COUNT(*) FROM public.users WHERE role = 'expert') as total_experts,
  (SELECT COUNT(*) FROM public.users WHERE role = 'organization') as total_organizations,
  (SELECT COUNT(*) FROM public.users WHERE is_admin = TRUE) as total_admins,
  (SELECT COUNT(*) FROM public.campaigns) as total_campaigns,
  (SELECT COUNT(*) FROM public.campaigns WHERE status = 'active') as active_campaigns,
  (SELECT COUNT(*) FROM public.proposals) as total_proposals,
  (SELECT COUNT(*) FROM public.proposals WHERE status = 'accepted') as accepted_proposals,
  (SELECT COUNT(*) FROM public.messages) as total_messages,
  (SELECT COUNT(DISTINCT sender_id) FROM public.messages WHERE created_at > NOW() - INTERVAL '7 days') as active_users_week,
  (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month;

-- Grant access to admin statistics view
GRANT SELECT ON admin_statistics TO authenticated;

-- Create a combined view for user profiles
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_admin,
  u.created_at,
  u.updated_at,
  COALESCE(ep.name, op.representative_name) as name,
  op.organization_name,
  ep.skills,
  ep.is_available,
  op.is_verified,
  ep.bio,
  op.description
FROM public.users u
LEFT JOIN public.expert_profiles ep ON u.id = ep.user_id
LEFT JOIN public.organization_profiles op ON u.id = op.user_id;

-- Grant access to user profiles view for admins
GRANT SELECT ON user_profiles TO authenticated;

-- Note: To create the initial admin user:
-- 1. Create a user through Supabase Auth Dashboard with email: admin@startupmatching.com
-- 2. Then run this query to make them admin:
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'admin@startupmatching.com';