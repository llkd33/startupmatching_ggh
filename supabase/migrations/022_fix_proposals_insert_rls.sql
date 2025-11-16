-- Fix proposals RLS policies to ensure SELECT and INSERT work correctly
-- This fixes "new row violates row-level security policy" errors when inserting proposals
-- and 406 errors when checking for existing proposals

-- Drop existing policies
DROP POLICY IF EXISTS "Experts can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Organizations can view campaign proposals" ON proposals;
DROP POLICY IF EXISTS "Experts can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Experts can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Organizations can update proposals" ON proposals;

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policy 1: Experts can view their own proposals (including when checking for existing)
CREATE POLICY "Experts can view own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
        AND expert_profiles.user_id = auth.uid()
    )
  );

-- Policy 2: Organizations can view proposals for their campaigns
CREATE POLICY "Organizations can view campaign proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM campaigns
      JOIN organization_profiles ON campaigns.organization_id = organization_profiles.id
      WHERE campaigns.id = proposals.campaign_id
        AND organization_profiles.user_id = auth.uid()
    )
  );

-- Policy 3: Experts can insert proposals for active campaigns
CREATE POLICY "Experts can insert proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check that expert_id belongs to current user
    EXISTS (
      SELECT 1 
      FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
        AND expert_profiles.user_id = auth.uid()
    )
    -- Check that campaign exists and is active
    AND EXISTS (
      SELECT 1 
      FROM campaigns
      WHERE campaigns.id = proposals.campaign_id
        AND campaigns.status = 'active'
    )
  );

-- Policy 4: Experts can update their own proposals (only if pending)
CREATE POLICY "Experts can update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
        AND expert_profiles.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
        AND expert_profiles.user_id = auth.uid()
    )
  );

-- Policy 5: Organizations can update proposals for their campaigns
CREATE POLICY "Organizations can update proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM campaigns
      JOIN organization_profiles ON campaigns.organization_id = organization_profiles.id
      WHERE campaigns.id = proposals.campaign_id
        AND organization_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM campaigns
      JOIN organization_profiles ON campaigns.organization_id = organization_profiles.id
      WHERE campaigns.id = proposals.campaign_id
        AND organization_profiles.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON proposals TO authenticated;

-- Add comments explaining the policies
COMMENT ON POLICY "Experts can view own proposals" ON proposals IS 
  'Allows experts to view their own proposals, including when checking for existing proposals.';
COMMENT ON POLICY "Experts can insert proposals" ON proposals IS 
  'Allows experts to insert proposals for active campaigns. 
   Verifies that the expert_id belongs to the current user and the campaign is active.';

