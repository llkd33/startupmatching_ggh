-- Connection Requests Table
-- This table stores requests from organizations to connect with experts

CREATE TABLE connection_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID REFERENCES expert_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organization_profiles(id) ON DELETE CASCADE,
  
  -- Request details
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  project_type TEXT NOT NULL,
  expected_budget TEXT,
  expected_duration TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  
  -- Contact sharing (populated when approved)
  shared_contact_info JSONB,
  
  -- Approval details
  expert_response TEXT,
  expert_responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for better performance
CREATE INDEX idx_connection_requests_expert_id ON connection_requests(expert_id);
CREATE INDEX idx_connection_requests_organization_id ON connection_requests(organization_id);
CREATE INDEX idx_connection_requests_status ON connection_requests(status);
CREATE INDEX idx_connection_requests_created_at ON connection_requests(created_at);

-- Enable Row Level Security
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizations can only see their own requests
CREATE POLICY "Organizations can view their own connection requests" ON connection_requests
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organization_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Experts can only see requests made to them
CREATE POLICY "Experts can view connection requests made to them" ON connection_requests
  FOR SELECT USING (
    expert_id IN (
      SELECT id FROM expert_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can create connection requests
CREATE POLICY "Organizations can create connection requests" ON connection_requests
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organization_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Experts can update connection requests made to them (for approval/rejection)
CREATE POLICY "Experts can update their connection requests" ON connection_requests
  FOR UPDATE USING (
    expert_id IN (
      SELECT id FROM expert_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can update their own requests (for status tracking)
CREATE POLICY "Organizations can update their own requests" ON connection_requests
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM organization_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_connection_requests_updated_at
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_requests_updated_at();

-- Create a function to automatically expire old requests
CREATE OR REPLACE FUNCTION expire_old_connection_requests()
RETURNS void AS $$
BEGIN
  UPDATE connection_requests 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run the expiration function
-- This would need to be set up separately in Supabase dashboard or via pg_cron extension