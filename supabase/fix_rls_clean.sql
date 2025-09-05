-- ============================================
-- Clean and Fix RLS Policies - Safe Version
-- ============================================
-- This version drops ALL policies first to avoid conflicts

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

-- Drop all policies on users table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.users;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    );
END $$;

-- Drop all policies on expert_profiles table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.expert_profiles;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'expert_profiles'
    );
END $$;

-- Drop all policies on organization_profiles table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.organization_profiles;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'organization_profiles'
    );
END $$;

-- Drop all policies on campaigns table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.campaigns;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'campaigns'
    );
END $$;

-- Drop all policies on proposals table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.proposals;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'proposals'
    );
END $$;

-- Drop all policies on messages table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.messages;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'messages'
    );
END $$;

-- Drop all policies on notifications table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.notifications;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'notifications'
    );
END $$;

-- Drop all policies on connection_requests table
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.connection_requests;', ' ')
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'connection_requests'
    );
END $$;

-- ============================================
-- STEP 2: Enable RLS on all tables
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create new policies
-- ============================================

-- Users Table Policies
CREATE POLICY "auth_users_all" ON public.users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Expert Profiles Policies
CREATE POLICY "expert_profiles_read" ON public.expert_profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "expert_profiles_manage_own" ON public.expert_profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Organization Profiles Policies
CREATE POLICY "org_profiles_read" ON public.organization_profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "org_profiles_manage_own" ON public.organization_profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Campaigns Policies
CREATE POLICY "campaigns_read_active" ON public.campaigns
    FOR SELECT TO authenticated
    USING (status = 'active' OR organization_id = auth.uid());

CREATE POLICY "campaigns_manage_own" ON public.campaigns
    FOR ALL TO authenticated
    USING (organization_id = auth.uid())
    WITH CHECK (organization_id = auth.uid());

-- Proposals Policies
CREATE POLICY "proposals_view_involved" ON public.proposals
    FOR SELECT TO authenticated
    USING (
        expert_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = proposals.campaign_id 
            AND campaigns.organization_id = auth.uid()
        )
    );

CREATE POLICY "proposals_manage_own" ON public.proposals
    FOR ALL TO authenticated
    USING (expert_id = auth.uid())
    WITH CHECK (expert_id = auth.uid());

-- Messages Policies
CREATE POLICY "messages_view_own" ON public.messages
    FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "messages_send" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_update_received" ON public.messages
    FOR UPDATE TO authenticated
    USING (receiver_id = auth.uid());

-- Notifications Policies
CREATE POLICY "notifications_manage_own" ON public.notifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Connection Requests Policies
CREATE POLICY "conn_requests_view" ON public.connection_requests
    FOR SELECT TO authenticated
    USING (
        organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
        OR 
        expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "conn_requests_create" ON public.connection_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "conn_requests_update" ON public.connection_requests
    FOR UPDATE TO authenticated
    USING (
        expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
        OR
        organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    );

-- ============================================
-- STEP 4: Verify
-- ============================================

SELECT 
    'RLS policies cleaned and recreated!' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';