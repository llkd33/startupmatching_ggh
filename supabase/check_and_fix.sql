-- ============================================
-- Supabase RLS 점검 및 수정 스크립트
-- ============================================
-- 이 스크립트는 현재 설정을 확인하고 문제를 해결합니다

-- ============================================
-- 1. 현재 RLS 정책 확인
-- ============================================

-- 모든 RLS 정책 확인
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- RLS가 활성화된 테이블 확인
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. 누락된 컬럼 추가 (필요한 경우)
-- ============================================

-- expert_profiles 테이블에 is_profile_complete 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expert_profiles' 
        AND column_name = 'is_profile_complete'
    ) THEN
        ALTER TABLE public.expert_profiles 
        ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
    END IF;
END $$;

-- organization_profiles 테이블에 address 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_profiles' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.organization_profiles 
        ADD COLUMN address TEXT;
    END IF;
END $$;

-- ============================================
-- 3. 기존 정책 삭제 (충돌 방지)
-- ============================================

-- Users 테이블 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;

-- Expert profiles 테이블 정책 삭제
DROP POLICY IF EXISTS "Anyone can view expert profiles" ON public.expert_profiles;
DROP POLICY IF EXISTS "Experts can insert own profile" ON public.expert_profiles;
DROP POLICY IF EXISTS "Experts can update own profile" ON public.expert_profiles;
DROP POLICY IF EXISTS "Experts can delete own profile" ON public.expert_profiles;
DROP POLICY IF EXISTS "Experts can view own profile" ON public.expert_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expert_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expert_profiles;
DROP POLICY IF EXISTS "Enable update for profile owner" ON public.expert_profiles;

-- Organization profiles 테이블 정책 삭제
DROP POLICY IF EXISTS "Anyone can view organization profiles" ON public.organization_profiles;
DROP POLICY IF EXISTS "Organizations can insert own profile" ON public.organization_profiles;
DROP POLICY IF EXISTS "Organizations can update own profile" ON public.organization_profiles;
DROP POLICY IF EXISTS "Organizations can delete own profile" ON public.organization_profiles;

-- Connection requests 테이블 정책 삭제
DROP POLICY IF EXISTS "Organizations can create connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Organizations can view own requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Experts can view requests to them" ON public.connection_requests;
DROP POLICY IF EXISTS "Experts can update requests to them" ON public.connection_requests;

-- Notifications 테이블 정책 삭제
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- ============================================
-- 4. 새로운 RLS 정책 생성
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users 테이블 정책
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Expert profiles 정책 (더 관대하게)
CREATE POLICY "Anyone can view expert profiles" ON public.expert_profiles
    FOR SELECT USING (true);

CREATE POLICY "Experts can manage own profile" ON public.expert_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Organization profiles 정책
CREATE POLICY "Anyone can view organization profiles" ON public.organization_profiles
    FOR SELECT USING (true);

CREATE POLICY "Organizations can manage own profile" ON public.organization_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Connection requests 정책
CREATE POLICY "Organizations can create requests" ON public.connection_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view related requests" ON public.connection_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_profiles
            WHERE id = organization_id AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Experts can update their requests" ON public.connection_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_id AND user_id = auth.uid()
        )
    );

-- Notifications 정책
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. 테스트 쿼리
-- ============================================

-- 현재 사용자 확인
SELECT auth.uid() as current_user_id;

-- Users 테이블 접근 테스트
SELECT * FROM public.users WHERE id = auth.uid();

-- Expert profiles 접근 테스트  
SELECT * FROM public.expert_profiles LIMIT 5;

-- ============================================
-- 6. 일반적인 문제 해결
-- ============================================

-- 409 오류 해결: users 테이블 중복 레코드 확인
SELECT id, email, count(*) 
FROM public.users 
GROUP BY id, email 
HAVING count(*) > 1;

-- 400 오류 해결: expert_profiles 무결성 확인
SELECT ep.* 
FROM public.expert_profiles ep
LEFT JOIN public.users u ON ep.user_id = u.id
WHERE u.id IS NULL;

-- 고아 레코드 정리 (user가 없는 profile)
DELETE FROM public.expert_profiles 
WHERE user_id NOT IN (SELECT id FROM public.users);

DELETE FROM public.organization_profiles 
WHERE user_id NOT IN (SELECT id FROM public.users);

-- ============================================
-- 7. 성능 최적화 인덱스 재생성
-- ============================================

-- 기존 인덱스 삭제 후 재생성
DROP INDEX IF EXISTS idx_expert_profiles_user_id;
CREATE INDEX idx_expert_profiles_user_id ON public.expert_profiles(user_id);

DROP INDEX IF EXISTS idx_organization_profiles_user_id;
CREATE INDEX idx_organization_profiles_user_id ON public.organization_profiles(user_id);

-- ============================================
-- 8. 권한 부여
-- ============================================

-- authenticated 사용자에게 필요한 권한 부여
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- anon 사용자에게 제한적 권한 부여 (공개 데이터만)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.expert_profiles TO anon;
GRANT SELECT ON public.organization_profiles TO anon;

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'RLS 정책 설정 완료!' as message;