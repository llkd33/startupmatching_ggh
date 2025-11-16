-- 관리자 계정 생성 SQL
-- admin@startupmatching.com 사용자를 관리자로 만들기

-- 1. is_admin 컬럼이 없으면 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. admin@startupmatching.com 사용자를 관리자로 만들기
UPDATE public.users 
SET 
  is_admin = TRUE,
  role = 'admin',
  updated_at = NOW()
WHERE email = 'admin@startupmatching.com';

-- 3. 결과 확인
SELECT 
  id, 
  email, 
  role, 
  is_admin, 
  created_at,
  updated_at
FROM public.users 
WHERE email = 'admin@startupmatching.com';

-- 4. 모든 관리자 목록 확인
SELECT 
  id, 
  email, 
  role, 
  is_admin, 
  created_at
FROM public.users 
WHERE is_admin = TRUE OR role = 'admin'
ORDER BY created_at DESC;

