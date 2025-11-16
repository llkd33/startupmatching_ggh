# 관리자 페이지 로그인 가이드

## 📍 관리자 로그인 페이지 접속 방법

**URL**: `/admin-login`

브라우저에서 다음 주소로 접속하세요:
```
http://localhost:3000/admin-login
```

또는 프로덕션 환경:
```
https://startupmatching.up.railway.app/admin-login
```

---

## 🔐 관리자 계정 생성 방법

### 방법 1: 기존 사용자를 관리자로 만들기 (권장)

이미 가입한 사용자가 있다면, Supabase SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- 1. is_admin 컬럼이 없으면 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. 기존 사용자를 관리자로 만들기 (이메일로 지정)
UPDATE public.users 
SET 
  is_admin = TRUE,
  role = 'admin',
  updated_at = NOW()
WHERE email = 'admin@startupmatching.com';  -- 또는 원하는 이메일

-- 3. 확인
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE email = 'admin@startupmatching.com';
```

**빠른 실행용 SQL** (`scripts/make_admin_simple.sql` 파일 참고):
```sql
-- admin@startupmatching.com을 관리자로 만들기
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
UPDATE public.users SET is_admin = TRUE, role = 'admin', updated_at = NOW() WHERE email = 'admin@startupmatching.com';
SELECT id, email, role, is_admin FROM public.users WHERE email = 'admin@startupmatching.com';
```

### 방법 2: 새 관리자 계정 생성

#### Step 1: Supabase Auth에서 사용자 생성

1. **Supabase Dashboard** 접속
2. **Authentication** → **Users** 메뉴로 이동
3. **"Add user"** 또는 **"Invite user"** 클릭
4. 다음 정보 입력:
   - **Email**: `admin@startupmatching.com` (또는 원하는 이메일)
   - **Password**: 강력한 비밀번호 입력
   - **Auto Confirm User**: ✅ 체크 (이메일 확인 없이 바로 사용 가능)

5. **"Create user"** 클릭

#### Step 2: users 테이블에 관리자 권한 부여

Supabase **SQL Editor**에서 다음 쿼리 실행:

```sql
-- 1. is_admin 컬럼이 없으면 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. 방금 생성한 사용자를 관리자로 만들기
UPDATE public.users 
SET 
  is_admin = TRUE,
  role = 'admin',
  updated_at = NOW()
WHERE email = 'admin@startupmatching.com';  -- Step 1에서 입력한 이메일

-- 3. 확인
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE email = 'admin@startupmatching.com';
```

#### Step 3: 마이그레이션 실행 (선택사항)

또는 마이그레이션 파일을 실행할 수도 있습니다:

```bash
# Supabase CLI 사용 시
supabase db push

# 또는 Supabase Dashboard에서
# SQL Editor → supabase/migrations/024_create_admin_account.sql 실행
```

**주의**: 마이그레이션은 `auth.users`에 사용자가 이미 존재할 때만 작동합니다.

---

## ✅ 로그인 확인

1. `/admin/login` 페이지로 이동
2. 생성한 관리자 이메일과 비밀번호 입력
3. **"관리자 로그인"** 버튼 클릭
4. 성공하면 `/admin` 대시보드로 리다이렉트됩니다

---

## 🚨 문제 해결

### "관리자 권한이 없습니다" 에러가 발생하는 경우

1. **users 테이블 확인**:
```sql
SELECT id, email, role, is_admin 
FROM public.users 
WHERE email = 'your-email@example.com';
```

2. **is_admin이 FALSE인 경우**:
```sql
UPDATE public.users 
SET is_admin = TRUE, role = 'admin'
WHERE email = 'your-email@example.com';
```

3. **role이 'admin'이 아닌 경우**:
```sql
UPDATE public.users 
SET role = 'admin', is_admin = TRUE
WHERE email = 'your-email@example.com';
```

### "users 테이블에 레코드가 없습니다" 에러

일반 로그인(`/auth/login`)을 먼저 한 번 시도하여 `users` 테이블에 레코드가 생성되도록 하세요.

### 첫 번째 사용자를 관리자로 만들기

```sql
-- 첫 번째 사용자를 관리자로 만들기
UPDATE public.users 
SET 
  is_admin = TRUE,
  role = 'admin',
  updated_at = NOW()
WHERE id = (
  SELECT id FROM public.users 
  ORDER BY created_at ASC 
  LIMIT 1
);
```

---

## 📝 관리자 권한 확인 쿼리

현재 모든 관리자 목록 확인:

```sql
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE is_admin = TRUE OR role = 'admin'
ORDER BY created_at DESC;
```

---

## 🔒 보안 주의사항

- ✅ 관리자 비밀번호는 강력하게 설정하세요
- ✅ 관리자 계정은 최소한으로 유지하세요
- ✅ 모든 관리자 활동은 `admin_logs` 테이블에 기록됩니다
- ✅ 프로덕션 환경에서는 관리자 이메일을 공개하지 마세요

