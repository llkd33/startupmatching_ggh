-- ============================================
-- Complete Database Fix
-- ============================================
-- This SQL fixes all database issues including missing tables and functions
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Enable Extensions and Create Types
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
        CREATE TYPE campaign_type AS ENUM ('mentoring', 'investment', 'service', 'consulting', 'development');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
        CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
    END IF;
END $$;

-- ============================================
-- 2. Create Missing Tables
-- ============================================

-- Campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mentoring', 'investment', 'service', 'consulting', 'development')),
    category TEXT,
    keywords TEXT[] DEFAULT '{}',
    budget_min INTEGER,
    budget_max INTEGER,
    start_date DATE,
    end_date DATE,
    location TEXT,
    required_experts INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled')),
    requirements JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
    proposal_text TEXT NOT NULL,
    estimated_budget INTEGER,
    estimated_start_date DATE,
    estimated_end_date DATE,
    portfolio_links TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    response_message TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, expert_id)
);

-- Update messages table to work with campaigns
DO $$
BEGIN
    -- Check if messages table has the old structure and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'connection_id'
        AND table_schema = 'public'
    ) THEN
        -- Add new columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'campaign_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.messages ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'proposal_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.messages ADD COLUMN proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'message_type'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system'));
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'read_at'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'updated_at'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    ELSE
        -- Create messages table with new structure if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
            proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- ============================================
-- 3. Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_keywords ON public.campaigns USING GIN(keywords);

CREATE INDEX IF NOT EXISTS idx_proposals_campaign_id ON public.proposals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_proposals_expert_id ON public.proposals(expert_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);

CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON public.messages(proposal_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);

-- ============================================
-- 4. Enable RLS and Create Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Organizations can manage own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Experts can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can view relevant proposals" ON public.proposals;
DROP POLICY IF EXISTS "Experts can update own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Organizations can update proposals for their campaigns" ON public.proposals;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;

-- Campaigns policies
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
    FOR SELECT USING (status = 'active');

CREATE POLICY "Organizations can manage own campaigns" ON public.campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

-- Proposals policies
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

-- ============================================
-- 5. Create Missing RPC Functions
-- ============================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.notifications
    WHERE user_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.messages
    WHERE receiver_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE id = notification_id
    AND user_id = auth.uid();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
    AND is_read = false;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message
CREATE OR REPLACE FUNCTION send_message(
    p_campaign_id UUID,
    p_proposal_id UUID DEFAULT NULL,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $
DECLARE
    message_id UUID;
BEGIN
    INSERT INTO public.messages (
        campaign_id, proposal_id, sender_id, receiver_id, content, message_type
    ) VALUES (
        p_campaign_id, p_proposal_id, p_sender_id, p_receiver_id, p_content, p_message_type
    ) RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update expert hashtags
CREATE OR REPLACE FUNCTION update_expert_hashtags(p_expert_id UUID)
RETURNS VOID AS $
BEGIN
    UPDATE public.expert_profiles
    SET updated_at = NOW()
    WHERE id = p_expert_id
    AND user_id = auth.uid();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to match campaign experts
CREATE OR REPLACE FUNCTION match_campaign_experts(
    p_campaign_id UUID,
    p_stage INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    expert_id UUID,
    user_id UUID,
    name TEXT,
    skills TEXT[],
    hashtags TEXT[],
    bio TEXT,
    hourly_rate INTEGER,
    rating DECIMAL(3,2),
    total_projects INTEGER,
    match_score INTEGER
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        ep.id as expert_id,
        ep.user_id,
        ep.name,
        ep.skills,
        ep.hashtags,
        ep.bio,
        ep.hourly_rate::INTEGER,
        ep.rating,
        ep.total_projects,
        CASE 
            WHEN ep.is_profile_complete AND ep.is_available THEN 100
            WHEN ep.is_available THEN 75
            ELSE 50
        END as match_score
    FROM public.expert_profiles ep
    WHERE ep.is_available = true
    AND ep.is_profile_complete = true
    ORDER BY match_score DESC, ep.rating DESC
    LIMIT p_limit;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Create Triggers
-- ============================================

-- Updated at triggers for new tables
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION update_expert_hashtags TO authenticated;
GRANT EXECUTE ON FUNCTION match_campaign_experts TO authenticated;

-- ============================================
-- 8. Test and Verify
-- ============================================

-- Test that all functions work
SELECT 
    'Database fix completed successfully!' as status,
    get_unread_notification_count() as notification_count,
    get_unread_message_count() as message_count;

-- Verify tables exist
SELECT 
    table_name,
    CASE WHEN table_name IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
    ('users'), 
    ('expert_profiles'), 
    ('organization_profiles'), 
    ('campaigns'), 
    ('proposals'), 
    ('messages'), 
    ('notifications')
) as t(table_name)
ORDER BY table_name;

-- Verify functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_unread_notification_count',
    'get_unread_message_count', 
    'mark_notification_read',
    'mark_all_notifications_read',
    'send_message',
    'update_expert_hashtags',
    'match_campaign_experts'
)
ORDER BY routine_name;