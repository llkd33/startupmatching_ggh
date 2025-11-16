-- Add performance indexes for common query patterns
-- This migration adds indexes to improve query performance across the application

-- Proposals table indexes
CREATE INDEX IF NOT EXISTS idx_proposals_submitted_at ON public.proposals(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_status_submitted_at ON public.proposals(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_expert_id_status ON public.proposals(expert_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_campaign_id_status ON public.proposals(campaign_id, status);

-- Campaigns table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created_at ON public.campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id_status ON public.campaigns(organization_id, status);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id_is_read ON public.messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id_sender_receiver ON public.messages(campaign_id, sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc ON public.messages(created_at DESC);

-- Expert profiles indexes
CREATE INDEX IF NOT EXISTS idx_expert_profiles_user_id_complete ON public.expert_profiles(user_id, is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_skills_gin ON public.expert_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_service_regions_gin ON public.expert_profiles USING GIN(service_regions);

-- Organization profiles indexes
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id_complete ON public.organization_profiles(user_id, is_profile_complete);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Message threads indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_participant_1_last_message ON public.message_threads(participant_1, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_participant_2_last_message ON public.message_threads(participant_2, last_message_at DESC);

-- Task categories indexes
CREATE INDEX IF NOT EXISTS idx_task_categories_organization_id_name ON public.task_categories(organization_id, name);

-- Comments for documentation
COMMENT ON INDEX idx_proposals_submitted_at IS 'Speeds up proposal list queries ordered by submission date';
COMMENT ON INDEX idx_proposals_status_submitted_at IS 'Optimizes filtered proposal queries by status';
COMMENT ON INDEX idx_messages_receiver_id_is_read IS 'Speeds up unread message count queries';
COMMENT ON INDEX idx_messages_campaign_id_sender_receiver IS 'Optimizes message thread queries';

DO $$ 
BEGIN
    RAISE NOTICE '✅ Performance indexes created successfully';
END $$;

