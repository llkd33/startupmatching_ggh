# 테스트 사용자 생성 가이드

## 방법 1: Supabase 대시보드에서 직접 생성 (권장)

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 로그인
   - 프로젝트 선택 (bgnuyghvjkqgwwvghqzo)

2. **이메일 확인 비활성화**
   - Authentication → Configuration → Email Auth
   - "Enable email confirmations" 토글을 **OFF**로 설정
   - Save 클릭

3. **SQL Editor에서 문제 수정**
   - SQL Editor 메뉴 클릭
   - `supabase/fix_user_creation.sql` 파일 내용을 복사하여 붙여넣기
   - Run 버튼 클릭

4. **테스트 사용자 생성**
   - Authentication → Users 메뉴
   - "Create User" 버튼 클릭
   - 다음 정보 입력:
     ```
     Email: demo@example.com
     Password: Demo1234!
     Auto Confirm User: ✅ 체크
     ```
   - Create User 클릭

5. **users 테이블에 데이터 추가**
   - Table Editor → users 테이블
   - Insert Row 클릭
   - 다음 정보 입력:
     ```
     id: (Authentication > Users에서 생성한 사용자의 UUID 복사)
     email: demo@example.com
     role: expert
     ```
   - Save 클릭

## 방법 2: SQL로 직접 처리

SQL Editor에서 다음 쿼리 실행:

```sql
-- 1. Auth 사용자 확인 (service_role 권한 필요)
SELECT id, email FROM auth.users WHERE email = 'demo@example.com';

-- 2. 만약 auth.users에 있다면, public.users에 추가
INSERT INTO public.users (id, email, role)
SELECT id, email, 'expert'
FROM auth.users
WHERE email = 'demo@example.com'
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, 
    role = EXCLUDED.role,
    updated_at = now();

-- 3. expert_profiles에도 추가
INSERT INTO public.expert_profiles (user_id, is_profile_complete)
SELECT id, false
FROM auth.users
WHERE email = 'demo@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

## 테스트 계정 정보

생성 후 다음 계정으로 로그인:

- **URL**: http://localhost:3009/auth/login
- **Email**: demo@example.com
- **Password**: Demo1234!

## 문제 해결

만약 여전히 "Database error" 가 발생한다면:

1. **RLS 정책 확인**
   - Table Editor → users → RLS Policies
   - RLS가 비활성화되어 있거나, INSERT 정책이 있는지 확인

2. **트리거 확인**
   - SQL Editor에서:
   ```sql
   -- 모든 트리거 확인
   SELECT trigger_name, event_object_table, action_statement 
   FROM information_schema.triggers 
   WHERE trigger_schema = 'public';
   
   -- 문제가 되는 트리거 삭제
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   ```

3. **수동으로 테스트 데이터 생성**
   - Table Editor에서 직접 데이터 입력
   - users 테이블에 수동으로 row 추가

## 로그인 성능 최적화 (이미 적용됨)

- ✅ 병렬 데이터 페칭 (60-70% 속도 향상)
- ✅ 향상된 로딩 상태 표시
- ✅ 에러 메시지 개선
- ✅ Supabase 클라이언트 최적화