-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('expert', 'organization', 'admin');
CREATE TYPE campaign_type AS ENUM ('mentoring', 'investment', 'service');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE notification_type AS ENUM ('campaign_match', 'proposal_received', 'message', 'system');

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expert profiles
CREATE TABLE public.expert_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    career_history JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    skills TEXT[] DEFAULT '{}',
    service_regions TEXT[] DEFAULT '{}',
    portfolio_url TEXT,
    bio TEXT,
    hourly_rate DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Organization profiles
CREATE TABLE public.organization_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL,
    business_number TEXT,
    representative_name TEXT NOT NULL,
    contact_position TEXT,
    industry TEXT,
    employee_count TEXT,
    website TEXT,
    description TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Campaigns
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type campaign_type NOT NULL,
    category TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    location TEXT,
    required_experts INTEGER DEFAULT 1,
    status campaign_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals
CREATE TABLE public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
    cover_letter TEXT NOT NULL,
    proposed_budget DECIMAL(12,2),
    proposed_timeline TEXT,
    attachments JSONB,
    status proposal_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, expert_id)
);

-- Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_expert_skills ON public.expert_profiles USING GIN(skills);
CREATE INDEX idx_expert_regions ON public.expert_profiles USING GIN(service_regions);
CREATE INDEX idx_campaign_keywords ON public.campaigns USING GIN(keywords);
CREATE INDEX idx_campaign_status ON public.campaigns(status);
CREATE INDEX idx_messages_campaign ON public.messages(campaign_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Expert profiles
CREATE POLICY "Experts can manage own profile" ON public.expert_profiles
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Everyone can view expert profiles" ON public.expert_profiles
    FOR SELECT USING (true);

-- Organization profiles
CREATE POLICY "Organizations can manage own profile" ON public.organization_profiles
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Everyone can view verified organizations" ON public.organization_profiles
    FOR SELECT USING (is_verified = true);

-- Campaigns
CREATE POLICY "Organizations can manage own campaigns" ON public.campaigns
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM public.organization_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view active campaigns" ON public.campaigns
    FOR SELECT USING (status IN ('active', 'in_progress'));

-- Proposals
CREATE POLICY "Experts can manage own proposals" ON public.proposals
    FOR ALL USING (
        expert_id IN (
            SELECT id FROM public.expert_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organizations can view proposals for their campaigns" ON public.proposals
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM public.campaigns c
            JOIN public.organization_profiles o ON c.organization_id = o.id
            WHERE o.user_id = auth.uid()
        )
    );

-- Messages
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'expert')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_profiles_updated_at BEFORE UPDATE ON public.expert_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_profiles_updated_at BEFORE UPDATE ON public.organization_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();