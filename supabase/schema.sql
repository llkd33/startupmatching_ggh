-- ============================================
-- StartupMatching Database Schema
-- ============================================
-- 이 SQL을 Supabase SQL Editor에서 실행하세요
-- 순서대로 실행해야 합니다

-- ============================================
-- 1. TABLES
-- ============================================

-- Users table (기본 사용자 정보)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('expert', 'organization', 'admin')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expert profiles (전문가 프로필)
CREATE TABLE IF NOT EXISTS public.expert_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    career_history JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    skills TEXT[] DEFAULT '{}',
    hashtags TEXT[] DEFAULT '{}',
    portfolio_url TEXT,
    bio TEXT,
    hourly_rate INTEGER,
    is_available BOOLEAN DEFAULT true,
    is_profile_complete BOOLEAN DEFAULT false,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Organization profiles (기관 프로필)
CREATE TABLE IF NOT EXISTS public.organization_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL,
    business_number TEXT,
    representative_name TEXT NOT NULL,
    contact_position TEXT,
    industry TEXT,
    employee_count TEXT,
    website TEXT,
    description TEXT,
    address TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Connection requests (연결 요청)
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
    campaign_title TEXT NOT NULL,
    campaign_description TEXT NOT NULL,
    project_duration TEXT,
    budget_range TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    request_message TEXT,
    response_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ
);

-- Notifications (알림)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('connection_request', 'request_approved', 'request_rejected', 'message', 'system')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (메시지)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.connection_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES (성능 최적화)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expert_profiles_user_id ON public.expert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_hashtags ON public.expert_profiles USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_is_available ON public.expert_profiles(is_available);

CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_is_verified ON public.organization_profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_connection_requests_organization_id ON public.connection_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_expert_id ON public.connection_requests(expert_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON public.connection_requests(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON public.messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Users table policies
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Expert profiles policies
-- ============================================

-- Anyone can view expert profiles (for search)
CREATE POLICY "Anyone can view expert profiles" ON public.expert_profiles
    FOR SELECT USING (true);

-- Experts can insert their own profile
CREATE POLICY "Experts can insert own profile" ON public.expert_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Experts can update their own profile
CREATE POLICY "Experts can update own profile" ON public.expert_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Experts can delete their own profile
CREATE POLICY "Experts can delete own profile" ON public.expert_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Organization profiles policies
-- ============================================

-- Anyone can view organization profiles
CREATE POLICY "Anyone can view organization profiles" ON public.organization_profiles
    FOR SELECT USING (true);

-- Organizations can insert their own profile
CREATE POLICY "Organizations can insert own profile" ON public.organization_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Organizations can update their own profile
CREATE POLICY "Organizations can update own profile" ON public.organization_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Organizations can delete their own profile
CREATE POLICY "Organizations can delete own profile" ON public.organization_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Connection requests policies
-- ============================================

-- Organizations can create connection requests
CREATE POLICY "Organizations can create connection requests" ON public.connection_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

-- Organizations can view their own requests
CREATE POLICY "Organizations can view own requests" ON public.connection_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

-- Experts can view requests sent to them
CREATE POLICY "Experts can view requests to them" ON public.connection_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
    );

-- Experts can update requests sent to them (approve/reject)
CREATE POLICY "Experts can update requests to them" ON public.connection_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- Notifications policies
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Messages policies
-- ============================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Users can send messages in their connections
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.connection_requests cr
            WHERE cr.id = connection_id 
            AND cr.status = 'approved'
            AND (
                EXISTS (SELECT 1 FROM public.organization_profiles WHERE id = cr.organization_id AND user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM public.expert_profiles WHERE id = cr.expert_id AND user_id = auth.uid())
            )
        )
    );

-- ============================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_profiles_updated_at BEFORE UPDATE ON public.expert_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_profiles_updated_at BEFORE UPDATE ON public.organization_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_requests_updated_at BEFORE UPDATE ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'expert'),
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to create notification when connection request is created
CREATE OR REPLACE FUNCTION handle_new_connection_request()
RETURNS TRIGGER AS $$
DECLARE
    expert_user_id UUID;
    org_name TEXT;
BEGIN
    -- Get expert's user_id
    SELECT user_id INTO expert_user_id
    FROM public.expert_profiles
    WHERE id = NEW.expert_id;
    
    -- Get organization name
    SELECT organization_name INTO org_name
    FROM public.organization_profiles
    WHERE id = NEW.organization_id;
    
    -- Create notification for expert
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
        expert_user_id,
        'connection_request',
        '새로운 연결 요청',
        org_name || '에서 연결 요청을 보냈습니다.',
        jsonb_build_object('request_id', NEW.id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new connection request
CREATE TRIGGER on_connection_request_created
    AFTER INSERT ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION handle_new_connection_request();

-- Function to create notification when connection request is approved/rejected
CREATE OR REPLACE FUNCTION handle_connection_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
    org_user_id UUID;
    expert_name TEXT;
BEGIN
    -- Only proceed if status actually changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Get organization's user_id
    SELECT user_id INTO org_user_id
    FROM public.organization_profiles
    WHERE id = NEW.organization_id;
    
    -- Get expert name
    SELECT name INTO expert_name
    FROM public.expert_profiles
    WHERE id = NEW.expert_id;
    
    -- Create notification based on status
    IF NEW.status = 'approved' THEN
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
            org_user_id,
            'request_approved',
            '연결 요청 승인됨',
            expert_name || '님이 연결 요청을 승인했습니다.',
            jsonb_build_object('request_id', NEW.id)
        );
    ELSIF NEW.status = 'rejected' THEN
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
            org_user_id,
            'request_rejected',
            '연결 요청 거절됨',
            expert_name || '님이 연결 요청을 거절했습니다.',
            jsonb_build_object('request_id', NEW.id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for connection request status change
CREATE TRIGGER on_connection_request_status_changed
    AFTER UPDATE ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION handle_connection_request_status_change();

-- ============================================
-- 5. VIEWS (for easier data access)
-- ============================================

-- View for expert search with full details
CREATE OR REPLACE VIEW expert_search_view AS
SELECT 
    ep.*,
    u.email,
    u.phone,
    COALESCE(
        (SELECT COUNT(*) FROM connection_requests WHERE expert_id = ep.id AND status = 'approved'),
        0
    ) as completed_projects,
    COALESCE(
        (SELECT AVG(rating) FROM connection_requests WHERE expert_id = ep.id AND rating IS NOT NULL),
        0
    ) as average_rating
FROM expert_profiles ep
JOIN users u ON ep.user_id = u.id
WHERE ep.is_available = true;

-- Grant permissions on views
GRANT SELECT ON expert_search_view TO authenticated;

-- ============================================
-- 6. INITIAL DATA (Optional)
-- ============================================

-- Add sample categories/industries if needed
-- INSERT INTO categories (name, slug) VALUES ...

-- ============================================
-- END OF SCHEMA
-- ============================================

-- Verify all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;