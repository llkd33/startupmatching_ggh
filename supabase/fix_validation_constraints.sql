-- ============================================
-- Fix Validation Constraints for Existing Data
-- ============================================
-- 기존 데이터와 충돌하는 제약 조건을 수정합니다.

-- ============================================
-- 1. 기존 데이터 정리
-- ============================================

-- 잘못된 전화번호 형식을 NULL로 변경 (또는 올바른 형식으로 수정)
UPDATE public.users 
SET phone = NULL 
WHERE phone IS NOT NULL 
AND phone !~ '^01[0-9]-[0-9]{3,4}-[0-9]{4}$'
AND phone != '';

-- 빈 문자열을 NULL로 변경
UPDATE public.users 
SET phone = NULL 
WHERE phone = '';

-- ============================================
-- 2. 더 유연한 전화번호 검증 함수
-- ============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS is_valid_phone(TEXT);

-- 더 유연한 한국 전화번호 검증 함수
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- NULL이면 유효
    IF phone IS NULL OR phone = '' THEN
        RETURN TRUE;
    END IF;
    
    -- 한국 휴대폰 번호 형식 검증 (더 유연하게)
    -- 010-1234-5678, 01012345678, 010 1234 5678 등을 모두 허용
    RETURN phone ~ '^01[0-9][-\s]?[0-9]{3,4}[-\s]?[0-9]{4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. 더 유연한 이메일 검증 함수
-- ============================================

-- 기존 함수 교체
DROP FUNCTION IF EXISTS is_valid_email(TEXT);

CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- NULL이면 무효
    IF email IS NULL OR email = '' THEN
        RETURN FALSE;
    END IF;
    
    -- 기본적인 이메일 형식 검증 (더 관대하게)
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
           AND length(email) <= 320  -- RFC 5321 제한
           AND email NOT LIKE '%..%'  -- 연속된 점 방지
           AND email NOT LIKE '.%'    -- 점으로 시작 방지
           AND email NOT LIKE '%.'    -- 점으로 끝 방지
           AND email LIKE '%@%';      -- @ 필수
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. URL 검증 함수 개선
-- ============================================

-- 더 유연한 URL 검증
DROP FUNCTION IF EXISTS is_valid_url(TEXT);

CREATE OR REPLACE FUNCTION is_valid_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- NULL이나 빈 문자열이면 유효 (선택사항이므로)
    IF url IS NULL OR url = '' THEN
        RETURN TRUE;
    END IF;
    
    -- HTTP/HTTPS URL 검증 (더 유연하게)
    RETURN url ~* '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
           AND length(url) <= 2000;  -- 합리적인 길이 제한
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. 기존 제약 조건이 있다면 제거
-- ============================================

-- 기존 제약 조건 제거 (있을 경우에만)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE public.expert_profiles DROP CONSTRAINT IF EXISTS valid_portfolio_url;
ALTER TABLE public.organization_profiles DROP CONSTRAINT IF EXISTS valid_website;

-- ============================================
-- 6. 새로운 제약 조건 추가 (검증된 함수 사용)
-- ============================================

-- 사용자 테이블 제약 조건
ALTER TABLE public.users 
    ADD CONSTRAINT valid_email CHECK (is_valid_email(email));

ALTER TABLE public.users 
    ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR is_valid_phone(phone));

-- 전문가 프로필 제약 조건
ALTER TABLE public.expert_profiles
    ADD CONSTRAINT valid_portfolio_url CHECK (portfolio_url IS NULL OR is_valid_url(portfolio_url));

-- 기관 프로필 제약 조건
ALTER TABLE public.organization_profiles
    ADD CONSTRAINT valid_website CHECK (website IS NULL OR is_valid_url(website));

-- ============================================
-- 7. 데이터 유효성 재확인
-- ============================================

-- 유효하지 않은 데이터가 남아있는지 확인
DO $$
DECLARE
    invalid_email_count INTEGER;
    invalid_phone_count INTEGER;
    invalid_portfolio_count INTEGER;
    invalid_website_count INTEGER;
BEGIN
    -- 유효하지 않은 이메일 확인
    SELECT COUNT(*) INTO invalid_email_count
    FROM public.users 
    WHERE NOT is_valid_email(email);
    
    -- 유효하지 않은 전화번호 확인
    SELECT COUNT(*) INTO invalid_phone_count
    FROM public.users 
    WHERE phone IS NOT NULL AND NOT is_valid_phone(phone);
    
    -- 유효하지 않은 포트폴리오 URL 확인
    SELECT COUNT(*) INTO invalid_portfolio_count
    FROM public.expert_profiles 
    WHERE portfolio_url IS NOT NULL AND NOT is_valid_url(portfolio_url);
    
    -- 유효하지 않은 웹사이트 URL 확인
    SELECT COUNT(*) INTO invalid_website_count
    FROM public.organization_profiles 
    WHERE website IS NOT NULL AND NOT is_valid_url(website);
    
    -- 결과 출력
    RAISE NOTICE '검증 결과:';
    RAISE NOTICE '- 유효하지 않은 이메일: % 개', invalid_email_count;
    RAISE NOTICE '- 유효하지 않은 전화번호: % 개', invalid_phone_count;
    RAISE NOTICE '- 유효하지 않은 포트폴리오 URL: % 개', invalid_portfolio_count;
    RAISE NOTICE '- 유효하지 않은 웹사이트 URL: % 개', invalid_website_count;
    
    IF invalid_email_count + invalid_phone_count + invalid_portfolio_count + invalid_website_count = 0 THEN
        RAISE NOTICE '✅ 모든 데이터가 유효합니다!';
    ELSE
        RAISE NOTICE '⚠️  일부 데이터를 수정해야 합니다.';
    END IF;
END
$$;

-- ============================================
-- 8. 추가 데이터 정리 (필요시)
-- ============================================

-- 유효하지 않은 포트폴리오 URL을 NULL로 변경
UPDATE public.expert_profiles 
SET portfolio_url = NULL 
WHERE portfolio_url IS NOT NULL 
AND NOT is_valid_url(portfolio_url);

-- 유효하지 않은 웹사이트 URL을 NULL로 변경
UPDATE public.organization_profiles 
SET website = NULL 
WHERE website IS NOT NULL 
AND NOT is_valid_url(website);

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ 검증 제약 조건 수정이 완료되었습니다.';
    RAISE NOTICE '📝 변경사항:';
    RAISE NOTICE '   - 더 유연한 전화번호 형식 허용';
    RAISE NOTICE '   - 기존 잘못된 데이터를 NULL로 정리';
    RAISE NOTICE '   - 개선된 이메일/URL 검증 함수';
    RAISE NOTICE '   - 모든 제약 조건이 기존 데이터와 호환됨';
END
$$;