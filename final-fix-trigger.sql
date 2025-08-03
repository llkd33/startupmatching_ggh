-- ========================================
-- 최종 Trigger 수정 스크립트
-- ========================================

-- 1. 기존 trigger와 함수 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. 개선된 trigger 함수 생성 (RLS 우회)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role_value user_role;
    phone_value TEXT;
BEGIN
    -- Role 값 추출 (기본값: expert)
    user_role_value := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'expert'::user_role
    );
    
    -- Phone 값 추출
    phone_value := NEW.raw_user_meta_data->>'phone';
    
    -- RLS를 우회하여 users 테이블에 삽입
    INSERT INTO public.users (id, email, role, phone, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_role_value,
        phone_value,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        phone = COALESCE(EXCLUDED.phone, users.phone),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- 오류 발생 시 로그만 남기고 계속 진행
        RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 3. Trigger 재생성
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- 4. RLS 정책 수정 (INSERT 허용)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. 기존 auth.users 동기화
INSERT INTO public.users (id, email, role, phone, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE((au.raw_user_meta_data->>'role')::user_role, 'expert'::user_role),
    au.raw_user_meta_data->>'phone',
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 6. 확인
SELECT 
    'Trigger 설정 완료' as status,
    COUNT(*) as synced_users
FROM public.users;

-- 7. 테스트 쿼리
SELECT 
    au.id,
    au.email as auth_email,
    pu.email as public_email,
    pu.role,
    pu.phone,
    CASE 
        WHEN pu.id IS NULL THEN '❌ Not synced'
        ELSE '✅ Synced'
    END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;