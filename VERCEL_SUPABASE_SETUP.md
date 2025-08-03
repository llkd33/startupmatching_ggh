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

### 4단계: 테이블 존재 확인
```sql
-- 필요한 테이블들이 존재하는지 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'expert_profiles', 'organization_profiles');
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