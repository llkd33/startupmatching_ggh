-- ============================================
-- Fix Database Errors - Safe Update
-- ============================================
-- Run this SQL in Supabase SQL Editor to fix the current errors

-- ============================================
-- 1. Drop existing policies to avoid conflicts
-- ============================================

-- Drop existing campaign policies if they exist
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Organizations can manage own campaigns" ON public.campaigns;

-- Drop existing proposal policies if they exist
DROP POLICY IF EXISTS "Experts can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can view relevant proposals" ON public.proposals;
DROP POLICY IF EXISTS "Experts can update own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Organizations can update proposals for their campaigns" ON public.proposals;

-- Drop existing message policies if they exist
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;

-- ============================================
-- 2. Create the missing RPC functions
-- ============================================

-- Function to get unread notification count (fixing the 404 error)
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    -- Return 0 if no user
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count unread notifications
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.notifications
    WHERE user_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    -- Return 0 if no user
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count unread messages
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.messages
    WHERE receiver_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Fix Messages table structure if needed
-- ============================================

-- Ensure messages table has the right structure
DO $$
BEGIN
    -- Check if messages table exists and recreate if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) THEN
        CREATE TABLE public.messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
            proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
            file_url TEXT,
            file_name TEXT,
            file_size INTEGER,
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON public.messages(proposal_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
    END IF;
END $$;

-- ============================================
-- 4. Create RLS Policies (Safe)
-- ============================================

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update their received messages" ON public.messages
    FOR UPDATE USING (
        auth.uid() = receiver_id
    );

-- Campaigns policies (recreate)
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
    FOR SELECT USING (status = 'active');

CREATE POLICY "Organizations can manage own campaigns" ON public.campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

-- Proposals policies (recreate)
CREATE POLICY "Experts can create proposals" ON public.proposals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view relevant proposals" ON public.proposals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.organization_profiles op ON c.organization_id = op.id
            WHERE c.id = campaign_id AND op.user_id = auth.uid()
        )
    );

CREATE POLICY "Experts can update own proposals" ON public.proposals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organizations can update proposals for their campaigns" ON public.proposals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.organization_profiles op ON c.organization_id = op.id
            WHERE c.id = campaign_id AND op.user_id = auth.uid()
        )
    );

-- ============================================
-- 5. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;

-- ============================================
-- 6. Verify the fix
-- ============================================

-- Test the functions
SELECT 'Functions created successfully' as status,
       get_unread_notification_count() as notification_count,
       get_unread_message_count() as message_count;

-- Show table status
SELECT table_name, 
       CASE WHEN table_name IN (
           SELECT tablename FROM pg_tables WHERE schemaname = 'public'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES ('campaigns'), ('proposals'), ('messages'), ('notifications')) as t(table_name);