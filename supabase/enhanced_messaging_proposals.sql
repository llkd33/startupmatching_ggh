-- ============================================
-- Enhanced Messaging and Proposal System
-- ============================================
-- Run this SQL in Supabase SQL Editor to enhance the messaging and proposal system

-- ============================================
-- 1. Enhanced Tables
-- ============================================

-- Campaigns table (for proposal system)
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
    attachments JSONB DEFAULT '[]'::jsonb,
    requirements JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals table (enhanced)
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

-- Enhanced Messages table (updated to work with campaigns and proposals)
DROP TABLE IF EXISTS public.messages CASCADE;
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

-- Message threads for better organization
CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    participant_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, participant_1, participant_2)
);

-- File attachments for messages
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Indexes for Performance
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
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON public.message_threads(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_message_threads_campaign ON public.message_threads(campaign_id);

-- ============================================
-- 3. RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

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

-- Message threads policies
CREATE POLICY "Users can view their message threads" ON public.message_threads
    FOR SELECT USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

CREATE POLICY "Users can create message threads" ON public.message_threads
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

-- Message attachments policies
CREATE POLICY "Users can view attachments in their messages" ON public.message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_id 
            AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        )
    );

-- ============================================
-- 4. Enhanced Functions
-- ============================================

-- Function to create message thread automatically
CREATE OR REPLACE FUNCTION create_message_thread(
    p_campaign_id UUID,
    p_proposal_id UUID DEFAULT NULL,
    p_participant_1 UUID,
    p_participant_2 UUID
)
RETURNS UUID AS $$
DECLARE
    thread_id UUID;
BEGIN
    -- Check if thread already exists
    SELECT id INTO thread_id
    FROM public.message_threads
    WHERE campaign_id = p_campaign_id
    AND ((participant_1 = p_participant_1 AND participant_2 = p_participant_2)
         OR (participant_1 = p_participant_2 AND participant_2 = p_participant_1));
    
    -- Create new thread if doesn't exist
    IF thread_id IS NULL THEN
        INSERT INTO public.message_threads (
            campaign_id, proposal_id, participant_1, participant_2
        ) VALUES (
            p_campaign_id, p_proposal_id, p_participant_1, p_participant_2
        ) RETURNING id INTO thread_id;
    END IF;
    
    RETURN thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message with thread management
CREATE OR REPLACE FUNCTION send_message(
    p_campaign_id UUID,
    p_proposal_id UUID DEFAULT NULL,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
    thread_id UUID;
BEGIN
    -- Create or get thread
    SELECT create_message_thread(p_campaign_id, p_proposal_id, p_sender_id, p_receiver_id) INTO thread_id;
    
    -- Insert message
    INSERT INTO public.messages (
        campaign_id, proposal_id, sender_id, receiver_id, content, message_type
    ) VALUES (
        p_campaign_id, p_proposal_id, p_sender_id, p_receiver_id, p_content, p_message_type
    ) RETURNING id INTO message_id;
    
    -- Update thread last message time
    UPDATE public.message_threads
    SET last_message_at = NOW()
    WHERE id = thread_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle proposal status changes
CREATE OR REPLACE FUNCTION handle_proposal_status_change()
RETURNS TRIGGER AS $$
DECLARE
    org_user_id UUID;
    expert_user_id UUID;
    campaign_title TEXT;
    expert_name TEXT;
BEGIN
    -- Only proceed if status actually changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Get related user IDs and names
    SELECT 
        op.user_id, c.title, ep.user_id, ep.name
    INTO 
        org_user_id, campaign_title, expert_user_id, expert_name
    FROM public.campaigns c
    JOIN public.organization_profiles op ON c.organization_id = op.id
    JOIN public.expert_profiles ep ON NEW.expert_id = ep.id
    WHERE c.id = NEW.campaign_id;
    
    -- Create notifications based on status
    IF NEW.status = 'accepted' THEN
        -- Notify expert
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
            expert_user_id,
            'proposal_accepted',
            '제안서가 승인되었습니다',
            '"' || campaign_title || '" 캠페인의 제안서가 승인되었습니다.',
            jsonb_build_object('proposal_id', NEW.id, 'campaign_id', NEW.campaign_id)
        );
        
        -- Create system message in the thread
        PERFORM send_message(
            NEW.campaign_id,
            NEW.id,
            org_user_id,
            expert_user_id,
            '제안서가 승인되었습니다. 프로젝트를 시작해보세요!',
            'system'
        );
        
    ELSIF NEW.status = 'rejected' THEN
        -- Notify expert
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
            expert_user_id,
            'proposal_rejected',
            '제안서가 거절되었습니다',
            '"' || campaign_title || '" 캠페인의 제안서가 거절되었습니다.',
            jsonb_build_object('proposal_id', NEW.id, 'campaign_id', NEW.campaign_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for proposal status changes
DROP TRIGGER IF EXISTS on_proposal_status_changed ON public.proposals;
CREATE TRIGGER on_proposal_status_changed
    AFTER UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION handle_proposal_status_change();

-- Function to handle new proposals
CREATE OR REPLACE FUNCTION handle_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
    org_user_id UUID;
    campaign_title TEXT;
    expert_name TEXT;
BEGIN
    -- Get organization user ID and campaign title
    SELECT op.user_id, c.title
    INTO org_user_id, campaign_title
    FROM public.campaigns c
    JOIN public.organization_profiles op ON c.organization_id = op.id
    WHERE c.id = NEW.campaign_id;
    
    -- Get expert name
    SELECT name INTO expert_name
    FROM public.expert_profiles
    WHERE id = NEW.expert_id;
    
    -- Create notification for organization
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
        org_user_id,
        'new_proposal',
        '새로운 제안서가 도착했습니다',
        expert_name || '님이 "' || campaign_title || '" 캠페인에 제안서를 보냈습니다.',
        jsonb_build_object('proposal_id', NEW.id, 'campaign_id', NEW.campaign_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new proposals
DROP TRIGGER IF EXISTS on_new_proposal ON public.proposals;
CREATE TRIGGER on_new_proposal
    AFTER INSERT ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION handle_new_proposal();

-- ============================================
-- 5. Views for Better Data Access
-- ============================================

-- Enhanced campaign view with proposal counts
CREATE OR REPLACE VIEW campaign_list_view AS
SELECT 
    c.*,
    op.organization_name,
    op.user_id as organization_user_id,
    COALESCE(proposal_stats.total_proposals, 0) as total_proposals,
    COALESCE(proposal_stats.pending_proposals, 0) as pending_proposals,
    COALESCE(proposal_stats.accepted_proposals, 0) as accepted_proposals
FROM campaigns c
JOIN organization_profiles op ON c.organization_id = op.id
LEFT JOIN (
    SELECT 
        campaign_id,
        COUNT(*) as total_proposals,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_proposals,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_proposals
    FROM proposals
    GROUP BY campaign_id
) proposal_stats ON c.id = proposal_stats.campaign_id;

-- Message thread view with last message info
CREATE OR REPLACE VIEW message_thread_view AS
SELECT 
    mt.*,
    u1.email as participant_1_email,
    u2.email as participant_2_email,
    ep1.name as participant_1_name,
    ep2.name as participant_2_name,
    op1.organization_name as participant_1_org_name,
    op2.organization_name as participant_2_org_name,
    c.title as campaign_title,
    last_msg.content as last_message_content,
    last_msg.created_at as last_message_time,
    COALESCE(unread_count.count, 0) as unread_count
FROM message_threads mt
JOIN users u1 ON mt.participant_1 = u1.id
JOIN users u2 ON mt.participant_2 = u2.id
LEFT JOIN expert_profiles ep1 ON u1.id = ep1.user_id
LEFT JOIN expert_profiles ep2 ON u2.id = ep2.user_id
LEFT JOIN organization_profiles op1 ON u1.id = op1.user_id
LEFT JOIN organization_profiles op2 ON u2.id = op2.user_id
LEFT JOIN campaigns c ON mt.campaign_id = c.id
LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages m
    WHERE (m.campaign_id = mt.campaign_id)
    AND ((m.sender_id = mt.participant_1 AND m.receiver_id = mt.participant_2)
         OR (m.sender_id = mt.participant_2 AND m.receiver_id = mt.participant_1))
    ORDER BY created_at DESC
    LIMIT 1
) last_msg ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    WHERE (m.campaign_id = mt.campaign_id)
    AND m.receiver_id = auth.uid()
    AND m.is_read = false
) unread_count ON true;

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

-- Grant permissions
GRANT SELECT ON campaign_list_view TO authenticated;
GRANT SELECT ON message_thread_view TO authenticated;
GRANT EXECUTE ON FUNCTION create_message_thread TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;

-- ============================================
-- 6. Update existing triggers
-- ============================================

-- Update the updated_at triggers for new tables
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- END OF ENHANCED SCHEMA
-- ============================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('campaigns', 'proposals', 'messages', 'message_threads', 'message_attachments')
ORDER BY table_name;
