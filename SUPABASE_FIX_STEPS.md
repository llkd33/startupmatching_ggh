# 🔧 Supabase Trigger 문제 해결 가이드

## 📌 현재 문제
- 회원가입 시 auth.users에는 생성되지만 public.users에는 생성되지 않음
- Trigger 함수가 제대로 작동하지 않는 상태

## ✅ 해결 단계

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택 (bgnuyghvjkqgwwvghqzo)

### 2단계: SQL Editor에서 수정된 Trigger 실행
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭
3. `fix-user-trigger.sql` 파일의 내용 전체를 복사하여 붙여넣기
4. **Run** 버튼 클릭 (또는 Ctrl+Enter)

### 3단계: 실행 결과 확인
성공 시 다음과 같은 결과가 나와야 합니다:
```
status
------
Trigger function created successfully

table_name    | count
------------- | -----
Auth users    | [숫자]
Public users  | [숫자]
```

두 숫자가 같아야 정상입니다.

### 4단계: 테스트
터미널에서 다시 테스트:
```bash
node test-registration.js
```

성공 메시지:
```
✅ Registration successful!
✅ User successfully created in users table
```

## 🔍 문제가 계속되는 경우

### 옵션 A: Trigger 권한 확인
SQL Editor에서 실행:
```sql
-- Trigger 상태 확인
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND trigger_name = 'on_auth_user_created';
```

### 옵션 B: 수동 동기화
기존 auth.users를 public.users에 동기화:
```sql
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
    id,
    email,
    'expert'::user_role,
    created_at,
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);
```

### 옵션 C: Fallback 메커니즘 사용
이미 `/src/lib/supabase.ts`에 fallback 코드를 추가했으므로,
Trigger가 작동하지 않아도 회원가입은 가능합니다.

## ✨ 최종 확인
1. 새로운 회원가입 테스트
2. 로그인 테스트
3. 전문가 프로필 생성 테스트

## 📝 참고사항
- Trigger는 Supabase의 권한 시스템 때문에 가끔 작동하지 않을 수 있음
- Fallback 메커니즘이 있어서 서비스는 정상 작동 가능
- Production 환경에서는 Supabase Support에 문의 권장