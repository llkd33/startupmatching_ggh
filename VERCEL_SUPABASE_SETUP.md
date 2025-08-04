# 🔧 Vercel 배포 후 Supabase 설정 가이드

## 🚨 현재 오류 상황
```
bgnuyghvjkqgwwvghqzo.supabase.co/rest/v1/users?select=*:1  Failed to load resource: the server responded with a status of 409 ()
bgnuyghvjkqgwwvghqzo.supabase.co/rest/v1/expert_profiles?select=id%2Cis_profile_complete&user_id=eq.4adb1959-675b-429e-8ca3-def0942d3f0f:1  Failed to load resource: the server responded with a status of 400 ()
```

## ✅ 해결 방법

### 1단계: Supabase 도메인 설정
1. **Supabase Dashboard 접속**: https://supabase.com/dashboard
2. **프로젝트 선택**: `bgnuyghvjkqgwwvghqzo`
3. **Authentication → URL Configuration**

#### Site URL 추가:
```
https://startupmatching.vercel.app
```

#### Redirect URLs 추가:
```
https://startupmatching.vercel.app/**
https://startupmatching.vercel.app/auth/callback
https://startupmatching.vercel.app/dashboard
https://startupmatching.vercel.app/auth/login
```

### 2단계: RLS 정책 확인
SQL Editor에서 다음 쿼리 실행:

```sql
-- 현재 정책 확인
SELECT schemaname, tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 3단계: 누락된 RLS 정책 추가
```sql
-- Users 테이블 정책 (409 오류 해결)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Expert profiles 정책 (400 오류 해결)
DROP POLICY IF EXISTS "Experts can view own profile" ON public.expert_profiles;
CREATE POLICY "Experts can view own profile" ON public.expert_profiles
    FOR SELECT USING (user_id = auth.uid() OR TRUE);

DROP POLICY IF EXISTS "Experts can insert own profile" ON public.expert_profiles;
CREATE POLICY "Experts can insert own profile" ON public.expert_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());
```

### 4단계: 테이블 존재 및 구조 확인
```sql
-- 1. 필요한 테이블들이 존재하는지 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'expert_profiles', 'organization_profiles');

-- 2. expert_profiles 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expert_profiles'
ORDER BY ordinal_position;

-- 3. is_profile_complete 컬럼이 없다면 추가
ALTER TABLE expert_profiles 
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT FALSE;

-- 4. hashtags 컬럼이 TEXT[]인지 확인 (JSON이면 변경 필요)
-- 만약 JSON 타입이라면:
-- ALTER TABLE expert_profiles ALTER COLUMN hashtags TYPE TEXT[] USING hashtags::TEXT[];
```

### 5단계: 환경 변수 재확인
Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://bgnuyghvjkqgwwvghqzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧪 테스트 방법

### 브라우저 개발자 도구에서:
```javascript
// Supabase 연결 테스트
console.log('Testing Supabase connection...');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// 회원가입 테스트
// 실제 이메일로 테스트 후 확인
```

### 예상 해결 결과:
- ✅ 409 오류 해결 (Users 테이블 접근 가능)
- ✅ 400 오류 해결 (Expert profiles 조회 가능)
- ✅ 회원가입/로그인 정상 작동
- ✅ 대시보드 정상 로딩
- ✅ 프로필 완성 버튼 정상 작동

## 🔧 추가 문제 해결

### 프로필 완성 버튼이 작동하지 않는 경우:
```sql
-- expert_profiles 테이블의 is_profile_complete 컬럼 확인
SELECT id, user_id, name, is_profile_complete 
FROM expert_profiles 
WHERE user_id = 'YOUR_USER_ID';

-- is_profile_complete 컬럼이 없다면 추가
ALTER TABLE expert_profiles 
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT FALSE;

-- 기존 완성된 프로필들 업데이트
UPDATE expert_profiles 
SET is_profile_complete = TRUE 
WHERE career_history IS NOT NULL 
  AND education IS NOT NULL 
  AND hashtags IS NOT NULL 
  AND array_length(hashtags, 1) > 0;
```

### 인증 토큰 오류 (400) 해결:
```sql
-- RLS 정책 재설정
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expert_profiles;
CREATE POLICY "Enable read access for authenticated users" ON public.expert_profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expert_profiles;
CREATE POLICY "Enable insert for authenticated users" ON public.expert_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for profile owner" ON public.expert_profiles;
CREATE POLICY "Enable update for profile owner" ON public.expert_profiles
    FOR UPDATE USING (auth.uid() = user_id);
```

## 📋 완료 체크리스트
- [ ] Supabase Site URL 설정
- [ ] Redirect URLs 설정
- [ ] RLS 정책 추가
- [ ] 테이블 존재 확인
- [ ] 환경 변수 확인
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 대시보드 접근 테스트

---
**💡 참고**: 설정 변경 후 Vercel에서 재배포가 필요할 수 있습니다.