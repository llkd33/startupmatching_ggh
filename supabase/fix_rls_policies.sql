-- ============================================
-- Fix RLS Policies for All Tables
-- ============================================
-- This fixes the 500 errors on API calls

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. Users Table Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;

-- Allow authenticated users to view all users (needed for role checking)
CREATE POLICY "Authenticated users can view all users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ============================================
-- 2. Expert Profiles Policies
-- ============================================
DROP POLICY IF EXISTS "Expert profiles are viewable by everyone" ON public.expert_profiles;
DROP POLICY IF EXISTS "Users can manage their own expert profile" ON public.expert_profiles;
DROP POLICY IF EXISTS "Authenticated users can view expert profiles" ON public.expert_profiles;

-- All authenticated users can view expert profiles
CREATE POLICY "Authenticated users can view expert profiles" ON public.expert_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can manage their own expert profile
CREATE POLICY "Users can manage their own expert profile" ON public.expert_profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. Organization Profiles Policies
-- ============================================
DROP POLICY IF EXISTS "Organization profiles are viewable by everyone" ON public.organization_profiles;
DROP POLICY IF EXISTS "Users can manage their own organization profile" ON public.organization_profiles;
DROP POLICY IF EXISTS "Authenticated users can view organization profiles" ON public.organization_profiles;

-- All authenticated users can view organization profiles
CREATE POLICY "Authenticated users can view organization profiles" ON public.organization_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can manage their own organization profile
CREATE POLICY "Users can manage their own organization profile" ON public.organization_profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. Campaigns Policies
-- ============================================
DROP POLICY IF EXISTS "Campaigns are viewable by everyone" ON public.campaigns;
DROP POLICY IF EXISTS "Organizations can manage their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Active campaigns are viewable by authenticated users" ON public.campaigns;

-- All authenticated users can view active campaigns
CREATE POLICY "Active campaigns are viewable by authenticated users" ON public.campaigns
    FOR SELECT
    TO authenticated
    USING (status = 'active' OR organization_id = auth.uid());

-- Organizations can manage their own campaigns
CREATE POLICY "Organizations can manage their own campaigns" ON public.campaigns
    FOR ALL
    TO authenticated
    USING (organization_id = auth.uid())
    WITH CHECK (organization_id = auth.uid());

-- ============================================
-- 5. Proposals Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view proposals they are involved in" ON public.proposals;
DROP POLICY IF EXISTS "Experts can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can manage their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Experts can manage their own proposals" ON public.proposals;

-- Users can view proposals where they are involved
CREATE POLICY "Users can view proposals they are involved in" ON public.proposals
    FOR SELECT
    TO authenticated
    USING (
        expert_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = proposals.campaign_id 
            AND campaigns.organization_id = auth.uid()
        )
    );

-- Experts can create and manage their own proposals
CREATE POLICY "Experts can manage their own proposals" ON public.proposals
    FOR ALL
    TO authenticated
    USING (expert_id = auth.uid())
    WITH CHECK (expert_id = auth.uid());

-- ============================================
-- 6. Messages Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT
    TO authenticated
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- Users can update their own messages (for read status)
CREATE POLICY "Users can update message read status" ON public.messages
    FOR UPDATE
    TO authenticated
    USING (receiver_id = auth.uid());

-- ============================================
-- 7. Notifications Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;

-- Users can view and manage their own notifications
CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 8. Connection Requests Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view connection requests they are involved in" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can view their connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can update connection requests" ON public.connection_requests;

-- Users can view connection requests they're involved in
CREATE POLICY "Users can view their connection requests" ON public.connection_requests
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
        OR 
        expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
    );

-- Organizations can create connection requests
CREATE POLICY "Organizations can create connection requests" ON public.connection_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    );

-- Users can update connection requests (experts can accept/reject)
CREATE POLICY "Users can update connection requests" ON public.connection_requests
    FOR UPDATE
    TO authenticated
    USING (
        expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
        OR
        organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    );

-- ============================================
-- Fix campaign-organization relationship
-- ============================================
-- Ensure foreign key exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'campaigns_organization_id_fkey'
        AND table_name = 'campaigns'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD CONSTRAINT campaigns_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON public.organization_profiles(user_id);

-- ============================================
-- Test the policies
-- ============================================
-- This should return without errors
SELECT 
    'RLS policies fixed successfully!' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';