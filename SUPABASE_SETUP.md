# Supabase 설정 가이드

## 🚨 현재 상황
- Supabase 프로젝트는 연결되어 있음 ✅
- 기본 테이블들은 생성되어 있음 ✅
- **문제**: "Database error saving new user" - trigger 함수 누락 ❌

## 🔧 해결 방법

### 1. Supabase 대시보드 접속
- [https://supabase.com/dashboard](https://supabase.com/dashboard) 접속
- 프로젝트 `bgnuyghvjkqgwwvghqzo` 선택

### 2. SQL Editor에서 trigger 함수 실행

왼쪽 메뉴에서 **SQL Editor** 클릭 후 아래 SQL을 실행하세요:

```sql
-- 1. 사용자 생성 trigger 함수
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'expert'),
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- 오류 로깅을 위한 예외 처리
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger 생성 (기존 것이 있다면 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3. 추가 필요한 함수들 확인

```sql
-- 연결 요청 알림 함수들이 있는지 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE specific_schema = 'public' 
AND routine_name LIKE '%connection%';
```

만약 결과가 비어있다면, 다음 파일들도 실행해야 합니다:
- `supabase_connection_requests_schema.sql`
- `supabase_notifications_schema.sql`

### 4. 테스트

SQL Editor에서 다음 명령으로 테스트:

```sql
-- 테스트 사용자 생성 (실제로는 앱에서 해야 함)
SELECT auth.users();

-- users 테이블 확인
SELECT * FROM public.users LIMIT 5;
```

## 🛠️ 문제 해결 체크리스트

### ✅ 확인 사항:
1. **테이블 존재 여부** - 모두 존재함
2. **환경 변수** - 올바르게 설정됨
3. **기본 연결** - 성공

### ❌ 해결 필요:
1. **trigger 함수** - 위 SQL 실행 필요
2. **사용자 생성 테스트** - trigger 설정 후 재테스트

## 📝 추가 설정 (옵션)

이메일 인증을 비활성화하려면 (개발 중에만):

1. Supabase 대시보드 → **Authentication** → **Settings**
2. **Enable email confirmations** 체크 해제

## 🧪 설정 완료 후 테스트 명령

프로젝트 폴더에서:
```bash
node test-registration.js
```

성공하면 다음과 같은 메시지가 나와야 합니다:
```
✅ Registration successful!
✅ User successfully created in users table
```