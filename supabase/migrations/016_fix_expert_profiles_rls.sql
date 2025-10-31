-- Fix expert_profiles RLS policies to allow proper access
-- This fixes the 400 Bad Request errors when querying expert_profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own expert profile" ON expert_profiles;
DROP POLICY IF EXISTS "Users can update own expert profile" ON expert_profiles;
DROP POLICY IF EXISTS "Users can insert own expert profile" ON expert_profiles;
DROP POLICY IF EXISTS "Organizations can view expert profiles" ON expert_profiles;
DROP POLICY IF EXISTS "Public can view completed expert profiles" ON expert_profiles;

-- Enable RLS
ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own expert profile
CREATE POLICY "Users can view own expert profile"
  ON expert_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Policy 2: Users can insert their own expert profile
CREATE POLICY "Users can insert own expert profile"
  ON expert_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy 3: Users can update their own expert profile
CREATE POLICY "Users can update own expert profile"
  ON expert_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy 4: Organizations can view all expert profiles
CREATE POLICY "Organizations can view expert profiles"
  ON expert_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'organization'
    )
  );

-- Policy 5: Authenticated users can view completed expert profiles
CREATE POLICY "Authenticated users can view completed profiles"
  ON expert_profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_profile_complete = true
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON expert_profiles TO authenticated;
GRANT SELECT ON expert_profiles TO anon;

-- Add helpful comment
COMMENT ON TABLE expert_profiles IS 'Expert profiles with proper RLS policies allowing:
1. Users to manage their own profiles
2. Organizations to view all profiles
3. Authenticated users to view completed profiles';
