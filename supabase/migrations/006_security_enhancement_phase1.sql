-- ============================================
-- Security Enhancement Phase 1: Critical Fixes
-- ============================================
-- 실행 전 반드시 백업을 수행하세요!
-- 이 스크립트는 기존 정책을 개선하여 보안을 강화합니다.

-- ============================================
-- 1. DROP OVERLY PERMISSIVE POLICIES
-- ============================================

-- Expert profiles: 과도한 공개 정책 제거
DROP POLICY IF EXISTS "Anyone can view expert profiles" ON public.expert_profiles;

-- Organization profiles: 과도한 공개 정책 제거  
DROP POLICY IF EXISTS "Anyone can view organization profiles" ON public.organization_profiles;

-- Notifications: 너무 관대한 INSERT 정책 제거
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- ============================================
-- 2. CREATE SECURE VIEW POLICIES
-- ============================================

-- Expert profiles: 제한된 공개 정보만 노출
CREATE POLICY "Public can view basic expert info" ON public.expert_profiles
    FOR SELECT 
    USING (
        -- 비로그인 사용자는 기본 정보만 조회 가능
        (auth.uid() IS NULL AND is_available = true AND is_profile_complete = true)
        OR
        -- 로그인 사용자는 전체 조회 가능
        (auth.uid() IS NOT NULL)
    );

-- Organization profiles: 인증된 사용자만 조회
CREATE POLICY "Authenticated can view organization profiles" ON public.organization_profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
    );

-- ============================================
-- 3. ADD MISSING DELETE POLICIES
-- ============================================

-- Users: 연결된 데이터가 없을 때만 삭제 가능
CREATE POLICY "Users can delete own account safely" ON public.users
    FOR DELETE USING (
        auth.uid() = id 
        AND NOT EXISTS (
            -- 진행 중인 연결 요청이 없어야 함
            SELECT 1 FROM public.connection_requests cr
            WHERE cr.status IN ('pending', 'approved')
            AND EXISTS (
                SELECT 1 FROM public.organization_profiles op 
                WHERE op.id = cr.organization_id AND op.user_id = auth.uid()
                UNION
                SELECT 1 FROM public.expert_profiles ep
                WHERE ep.id = cr.expert_id AND ep.user_id = auth.uid()
            )
        )
    );

-- Messages: 발신자만 24시간 내 삭제 가능
CREATE POLICY "Senders can delete recent messages" ON public.messages
    FOR DELETE USING (
        auth.uid() = sender_id 
        AND created_at > NOW() - INTERVAL '24 hours'
    );

-- Connection requests: 요청자만 pending 상태일 때 삭제 가능
CREATE POLICY "Organizations can delete pending requests" ON public.connection_requests
    FOR DELETE USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- 4. ENHANCE ADMIN SECURITY
-- ============================================

-- Admin 검증 함수 (강화된 버전)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        -- 신규 admin 계정 즉시 권한 사용 방지
        AND created_at < NOW() - INTERVAL '1 hour'
        -- 추가 검증 조건 (예: 이메일 도메인 체크)
        AND email LIKE '%@startupmatching.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin 정책 업데이트 (함수 사용)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Verified admins can view all users" ON public.users
    FOR SELECT USING (
        auth.uid() = id OR is_admin()
    );

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Verified admins can update all users" ON public.users
    FOR UPDATE USING (
        auth.uid() = id OR is_admin()
    );

-- ============================================
-- 5. SECURE NOTIFICATION SYSTEM
-- ============================================

-- 안전한 알림 생성 정책
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        -- 자기 자신에게만 알림 생성 가능
        auth.uid() = user_id
        OR
        -- 시스템 함수를 통한 알림 생성 (SECURITY DEFINER)
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- ============================================
-- 6. RATE LIMITING FOUNDATION
-- ============================================

-- Rate limiting 테이블
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT (date_trunc('minute', NOW())),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, action_type, window_start)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limit 체크 함수
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_action_type TEXT,
    p_max_requests INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- 비로그인 사용자는 더 엄격한 제한
    IF v_user_id IS NULL THEN
        p_max_requests := p_max_requests / 2;
    END IF;
    
    -- 현재 window의 요청 수 확인
    SELECT SUM(request_count) INTO v_count
    FROM public.rate_limits
    WHERE user_id = v_user_id
    AND action_type = p_action_type
    AND window_start > NOW() - INTERVAL '1 minute';
    
    -- 제한 초과 체크
    IF COALESCE(v_count, 0) >= p_max_requests THEN
        RAISE EXCEPTION 'Rate limit exceeded for action: %', p_action_type;
        RETURN FALSE;
    END IF;
    
    -- 요청 카운트 증가
    INSERT INTO public.rate_limits (user_id, action_type, request_count)
    VALUES (v_user_id, p_action_type, 1)
    ON CONFLICT (user_id, action_type, window_start)
    DO UPDATE SET request_count = public.rate_limits.request_count + 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. AUDIT TRAIL ENHANCEMENT
-- ============================================

-- 향상된 감사 로그 테이블
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs" ON public.security_audit_logs
    FOR SELECT USING (is_admin());

-- Audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
DECLARE
    v_risk_level TEXT;
BEGIN
    -- Determine risk level based on operation
    v_risk_level := CASE 
        WHEN TG_OP = 'DELETE' THEN 'high'
        WHEN TG_TABLE_NAME IN ('users', 'admin_audit_logs') THEN 'high'
        WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'organization_profiles' 
             AND OLD.is_verified != NEW.is_verified THEN 'critical'
        ELSE 'medium'
    END;
    
    -- Log the event
    INSERT INTO public.security_audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        risk_level,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_risk_level,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        inet(current_setting('request.headers', true)::json->>'x-forwarded-for'),
        current_setting('request.headers', true)::json->>'user-agent'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION log_security_event();

CREATE TRIGGER audit_organization_verification
    AFTER UPDATE ON public.organization_profiles
    FOR EACH ROW 
    WHEN (OLD.is_verified IS DISTINCT FROM NEW.is_verified)
    EXECUTE FUNCTION log_security_event();

-- ============================================
-- 8. INPUT VALIDATION FUNCTIONS
-- ============================================

-- Email validation
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phone validation (Korean format)
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN phone ~ '^01[0-9]-[0-9]{3,4}-[0-9]{4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- URL validation
CREATE OR REPLACE FUNCTION is_valid_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN url ~* '^https?://[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}(/.*)?$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraints using validation functions
ALTER TABLE public.users 
    ADD CONSTRAINT valid_email CHECK (is_valid_email(email));

ALTER TABLE public.users 
    ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR is_valid_phone(phone));

ALTER TABLE public.expert_profiles
    ADD CONSTRAINT valid_portfolio_url CHECK (portfolio_url IS NULL OR is_valid_url(portfolio_url));

ALTER TABLE public.organization_profiles
    ADD CONSTRAINT valid_website CHECK (website IS NULL OR is_valid_url(website));

-- ============================================
-- 9. SECURE DEFAULT VALUES
-- ============================================

-- Ensure sensitive fields have secure defaults
ALTER TABLE public.expert_profiles 
    ALTER COLUMN is_available SET DEFAULT false;

ALTER TABLE public.organization_profiles 
    ALTER COLUMN is_verified SET DEFAULT false;

ALTER TABLE public.connection_requests 
    ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- 10. CLEANUP OLD/STALE DATA
-- ============================================

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.security_audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND risk_level IN ('low', 'medium');
    
    -- Keep high risk events for 1 year
    DELETE FROM public.security_audit_logs 
    WHERE created_at < NOW() - INTERVAL '365 days'
    AND risk_level IN ('high', 'critical');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- IMPORTANT: Manual Steps Required
-- ============================================
-- 1. Review and test these policies in a staging environment
-- 2. Backup your database before applying
-- 3. Apply during low-traffic period
-- 4. Monitor for any access issues after deployment
-- 5. Set up scheduled jobs for cleanup functions
-- 6. Configure Supabase Dashboard alerts for security events