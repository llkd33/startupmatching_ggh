-- Fix proposals RLS policies to allow proper JOIN queries
-- This fixes the 400 Bad Request errors when querying proposals with campaigns and expert_profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Experts can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Organizations can view campaign proposals" ON proposals;
DROP POLICY IF EXISTS "Experts can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Experts can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Organizations can update proposals" ON proposals;

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policy 1: Experts can view their own proposals
CREATE POLICY "Experts can view own proposals"
  ON proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
      AND expert_profiles.user_id = auth.uid()
    )
  );

-- Policy 2: Organizations can view proposals for their campaigns
CREATE POLICY "Organizations can view campaign proposals"
  ON proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      JOIN organization_profiles ON campaigns.organization_id = organization_profiles.id
      WHERE campaigns.id = proposals.campaign_id
      AND organization_profiles.user_id = auth.uid()
    )
  );

-- Policy 3: Experts can insert proposals for active campaigns
CREATE POLICY "Experts can insert proposals"
  ON proposals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
      AND expert_profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = proposals.campaign_id
      AND campaigns.status = 'active'
    )
  );

-- Policy 4: Experts can update their own proposals (only if pending)
CREATE POLICY "Experts can update own proposals"
  ON proposals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
      AND expert_profiles.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expert_profiles
      WHERE expert_profiles.id = proposals.expert_id
      AND expert_profiles.user_id = auth.uid()
    )
  );

-- Policy 5: Organizations can update proposals for their campaigns
CREATE POLICY "Organizations can update proposals"
  ON proposals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      JOIN organization_profiles ON campaigns.organization_id = organization_profiles.id
      WHERE campaigns.id = proposals.campaign_id
      AND organization_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      JOIN organization_profiles ON campaigns.organization_id = organization_profiles.id
      WHERE campaigns.id = proposals.campaign_id
      AND organization_profiles.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON proposals TO authenticated;

-- Add helpful comment
COMMENT ON TABLE proposals IS 'Proposals with proper RLS policies allowing:
1. Experts to manage their own proposals
2. Organizations to manage proposals for their campaigns
3. Proper JOIN support with campaigns and expert_profiles';
