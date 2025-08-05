-- ============================================
-- 이메일 알림 시스템 설정
-- ============================================

-- 1. 사용자 이메일 알림 설정 테이블
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    connection_request_email BOOLEAN DEFAULT true,
    request_approved_email BOOLEAN DEFAULT true,
    request_rejected_email BOOLEAN DEFAULT true,
    marketing_email BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. 이메일 로그 테이블 (추적용)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    metadata JSONB
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON public.user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);

-- 4. RLS 정책
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림 설정만 관리 가능
CREATE POLICY "Users can manage own notification settings" ON public.user_notification_settings
    FOR ALL USING (auth.uid() = user_id);

-- 사용자는 자신의 이메일 로그만 조회 가능
CREATE POLICY "Users can view own email logs" ON public.email_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 시스템은 이메일 로그를 생성할 수 있음
CREATE POLICY "System can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (true);

-- 5. 기본 알림 설정 생성 함수
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 새 사용자 생성 시 기본 알림 설정 생성
CREATE TRIGGER create_notification_settings_on_user_create
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();

-- 7. updated_at 자동 업데이트
CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON public.user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 이메일 발송 함수 (Supabase 내장 기능 활용)
-- ============================================

-- 연결 요청 이메일 발송 함수
CREATE OR REPLACE FUNCTION send_connection_request_email()
RETURNS TRIGGER AS $$
DECLARE
    expert_email TEXT;
    expert_name TEXT;
    org_name TEXT;
    should_send BOOLEAN;
BEGIN
    -- 전문가 정보 조회
    SELECT u.email, ep.name INTO expert_email, expert_name
    FROM public.expert_profiles ep
    JOIN public.users u ON ep.user_id = u.id
    WHERE ep.id = NEW.expert_id;
    
    -- 기관명 조회
    SELECT organization_name INTO org_name
    FROM public.organization_profiles
    WHERE id = NEW.organization_id;
    
    -- 이메일 알림 설정 확인
    SELECT COALESCE(uns.connection_request_email, true) INTO should_send
    FROM public.users u
    LEFT JOIN public.user_notification_settings uns ON u.id = uns.user_id
    WHERE u.email = expert_email;
    
    -- 이메일 발송 설정이 켜져 있으면 로그 생성
    IF should_send THEN
        INSERT INTO public.email_logs (
            user_id,
            email_type,
            recipient_email,
            subject,
            status,
            metadata
        )
        SELECT 
            u.id,
            'connection_request',
            expert_email,
            '새로운 연결 요청이 있습니다',
            'pending',
            jsonb_build_object(
                'expert_name', expert_name,
                'organization_name', org_name,
                'request_id', NEW.id,
                'campaign_title', NEW.campaign_title
            )
        FROM public.users u
        WHERE u.email = expert_email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 연결 요청 상태 변경 이메일 발송 함수
CREATE OR REPLACE FUNCTION send_connection_status_email()
RETURNS TRIGGER AS $$
DECLARE
    org_email TEXT;
    org_name TEXT;
    expert_name TEXT;
    should_send BOOLEAN;
    email_type TEXT;
BEGIN
    -- 상태가 실제로 변경되었는지 확인
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- 기관 정보 조회
    SELECT u.email, op.organization_name INTO org_email, org_name
    FROM public.organization_profiles op
    JOIN public.users u ON op.user_id = u.id
    WHERE op.id = NEW.organization_id;
    
    -- 전문가 이름 조회
    SELECT name INTO expert_name
    FROM public.expert_profiles
    WHERE id = NEW.expert_id;
    
    -- 이메일 타입 설정
    IF NEW.status = 'approved' THEN
        email_type := 'request_approved';
        SELECT COALESCE(uns.request_approved_email, true) INTO should_send
        FROM public.users u
        LEFT JOIN public.user_notification_settings uns ON u.id = uns.user_id
        WHERE u.email = org_email;
    ELSIF NEW.status = 'rejected' THEN
        email_type := 'request_rejected';
        SELECT COALESCE(uns.request_rejected_email, true) INTO should_send
        FROM public.users u
        LEFT JOIN public.user_notification_settings uns ON u.id = uns.user_id
        WHERE u.email = org_email;
    ELSE
        should_send := false;
    END IF;
    
    -- 이메일 발송 설정이 켜져 있으면 로그 생성
    IF should_send THEN
        INSERT INTO public.email_logs (
            user_id,
            email_type,
            recipient_email,
            subject,
            status,
            metadata
        )
        SELECT 
            u.id,
            email_type,
            org_email,
            CASE 
                WHEN NEW.status = 'approved' THEN '연결 요청이 승인되었습니다'
                WHEN NEW.status = 'rejected' THEN '연결 요청이 거절되었습니다'
            END,
            'pending',
            jsonb_build_object(
                'organization_name', org_name,
                'expert_name', expert_name,
                'request_id', NEW.id,
                'campaign_title', NEW.campaign_title,
                'status', NEW.status
            )
        FROM public.users u
        WHERE u.email = org_email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 트리거 생성
DROP TRIGGER IF EXISTS send_email_on_connection_request ON public.connection_requests;
CREATE TRIGGER send_email_on_connection_request
    AFTER INSERT ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION send_connection_request_email();

DROP TRIGGER IF EXISTS send_email_on_status_change ON public.connection_requests;
CREATE TRIGGER send_email_on_status_change
    AFTER UPDATE ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION send_connection_status_email();

-- ============================================
-- 이메일 처리 뷰 (대기 중인 이메일)
-- ============================================
CREATE OR REPLACE VIEW pending_emails AS
SELECT 
    el.id,
    el.user_id,
    el.email_type,
    el.recipient_email,
    el.subject,
    el.metadata,
    el.sent_at,
    u.id as user_uuid
FROM email_logs el
LEFT JOIN users u ON el.user_id = u.id
WHERE el.status = 'pending'
ORDER BY el.sent_at ASC;

-- 권한 부여
GRANT SELECT ON pending_emails TO service_role;

-- ============================================
-- 확인 메시지
-- ============================================
SELECT '✅ 이메일 알림 시스템 테이블 및 함수 생성 완료' as status;