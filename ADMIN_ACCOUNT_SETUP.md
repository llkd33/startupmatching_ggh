# 관리자 계정 설정 가이드

## 🔴 "Invalid login credentials" 에러 해결 방법

이 에러는 **이메일 또는 비밀번호가 잘못되었거나, 계정이 존재하지 않는다**는 의미입니다.

---

## ✅ 해결 방법 (단계별)

### Step 1: Supabase Auth에서 사용자 확인/생성

1. **Supabase Dashboard** 접속
2. **Authentication** → **Users** 메뉴로 이동
3. `admin@startupmatching.com` 사용자가 있는지 확인

#### 사용자가 없는 경우:
1. **"Add user"** 또는 **"Invite user"** 클릭
2. 다음 정보 입력:
   - **Email**: `admin@startupmatching.com`
   - **Password**: 강력한 비밀번호 입력 (예: `Admin123!@#`)
   - **Auto Confirm User**: ✅ 체크 (이메일 확인 없이 바로 사용 가능)
3. **"Create user"** 클릭

#### 사용자가 있는 경우:
1. 사용자 행을 클릭하여 상세 정보 확인
2. **"Reset Password"** 버튼 클릭하여 새 비밀번호 설정
3. 또는 **"Send password reset email"** 클릭

---

### Step 2: users 테이블에 레코드 생성/확인

Supabase **SQL Editor**에서 다음 쿼리 실행:

```sql
-- 1. users 테이블에 레코드가 있는지 확인
SELECT id, email, role, is_admin 
FROM public.users 
WHERE email = 'admin@startupmatching.com';

-- 2. 레코드가 없다면 생성 (auth.users의 ID를 가져와서)
-- 먼저 auth.users에서 ID 확인
SELECT id, email FROM auth.users WHERE email = 'admin@startupmatching.com';

-- 3. 위에서 얻은 ID를 사용하여 users 테이블에 레코드 생성
-- (예시: UUID를 실제 ID로 변경)
INSERT INTO public.users (id, email, role, is_admin, created_at, updated_at)
SELECT 
  id,
  email,
  'admin',
  TRUE,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@startupmatching.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  is_admin = TRUE,
  updated_at = NOW();
```

---

### Step 3: 관리자 권한 부여

```sql
-- is_admin 컬럼이 없으면 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- admin@startupmatching.com을 관리자로 만들기
UPDATE public.users 
SET 
  is_admin = TRUE,
  role = 'admin',
  updated_at = NOW()
WHERE email = 'admin@startupmatching.com';

-- 확인
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE email = 'admin@startupmatching.com';
```

---

## 🚀 빠른 설정 (한 번에 실행)

다음 SQL을 **순서대로** 실행하세요:

```sql
-- 1단계: is_admin 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2단계: auth.users에서 사용자 ID 가져오기
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- auth.users에서 사용자 ID 가져오기
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@startupmatching.com';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '사용자가 auth.users에 없습니다. 먼저 Supabase Dashboard에서 사용자를 생성하세요.';
  END IF;
  
  -- users 테이블에 레코드 생성 또는 업데이트
  INSERT INTO public.users (id, email, role, is_admin, created_at, updated_at)
  VALUES (admin_user_id, 'admin@startupmatching.com', 'admin', TRUE, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    is_admin = TRUE,
    updated_at = NOW();
  
  RAISE NOTICE '✅ 관리자 계정 설정 완료: admin@startupmatching.com';
END $$;

-- 3단계: 확인
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE email = 'admin@startupmatching.com';
```

---

## 🔍 문제 진단

### 1. 사용자가 auth.users에 없음
**증상**: SQL 실행 시 "사용자가 auth.users에 없습니다" 에러

**해결**: 
- Supabase Dashboard → Authentication → Users에서 사용자 생성

### 2. users 테이블에 레코드가 없음
**증상**: 로그인은 되지만 "사용자 정보를 찾을 수 없습니다" 에러

**해결**: 
- Step 2의 INSERT 쿼리 실행

### 3. 관리자 권한이 없음
**증상**: 로그인은 되지만 "관리자 권한이 없습니다" 에러

**해결**: 
- Step 3의 UPDATE 쿼리 실행

### 4. 비밀번호를 모름
**증상**: "Invalid login credentials" 에러

**해결**: 
- Supabase Dashboard → Authentication → Users에서 비밀번호 재설정

---

## 📝 체크리스트

- [ ] Supabase Auth에 `admin@startupmatching.com` 사용자 존재
- [ ] 사용자 비밀번호 확인/재설정 완료
- [ ] `public.users` 테이블에 레코드 존재
- [ ] `is_admin = TRUE` 또는 `role = 'admin'` 설정 완료
- [ ] `/admin-login`에서 로그인 테스트 성공

---

## 🆘 여전히 문제가 있다면

브라우저 개발자 도구(F12) → Console 탭에서 다음을 확인:
1. 정확한 에러 메시지
2. 콘솔 로그의 각 단계 (🔐, ✅, ❌ 등)
3. Network 탭에서 API 요청 상태

