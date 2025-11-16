# Railway에서 Resend API 키 설정 가이드

## 🚀 Railway에 Resend API 키 추가하기

### 방법 1: Railway 웹 대시보드 사용 (권장)

1. **Railway 프로젝트 접속**
   - [Railway Dashboard](https://railway.app)에 로그인
   - 배포된 프로젝트 선택

2. **서비스 선택**
   - 프로젝트 내의 웹 서비스(서비스 이름) 클릭

3. **Variables 탭 이동**
   - 상단 메뉴에서 **"Variables"** 탭 클릭

4. **환경 변수 추가**
   - **"New Variable"** 또는 **"RAW Editor"** 버튼 클릭
   - 다음 정보 입력:
     ```
     Key: RESEND_API_KEY
     Value: re_6kDHUGWP_QHKjjkd1ZhzsMGktWhCK38zE
     ```
   - **"Add"** 또는 **"Save"** 클릭

5. **자동 재배포**
   - Railway가 환경 변수 변경을 감지하고 자동으로 재배포를 시작합니다
   - 배포가 완료될 때까지 기다립니다 (보통 2-5분)

### 방법 2: Railway CLI 사용

```bash
# Railway CLI 설치 (아직 설치하지 않은 경우)
npm i -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 선택
railway link

# 환경 변수 추가
railway variables set RESEND_API_KEY=re_6kDHUGWP_QHKjjkd1ZhzsMGktWhCK38zE
```

## ✅ 설정 확인

### 1. Railway 로그 확인
- Railway 대시보드 → 서비스 → **"Deployments"** 탭
- 최신 배포의 로그 확인
- 에러가 없는지 확인

### 2. 애플리케이션 테스트
배포 완료 후 다음을 테스트:
- 제안서 승인 시 이메일 발송 확인
- Resend 대시보드의 **"Logs"** 탭에서 이메일 발송 기록 확인

## 🔍 문제 해결

### "RESEND_API_KEY is not set" 경고가 로그에 나타나는 경우

1. **환경 변수 이름 확인**
   - 정확히 `RESEND_API_KEY`인지 확인 (대소문자 구분)
   - 앞뒤 공백이 없는지 확인

2. **재배포 확인**
   - 환경 변수 추가 후 재배포가 완료되었는지 확인
   - Railway 대시보드에서 배포 상태 확인

3. **변수 값 확인**
   - Resend API 키가 올바른지 확인
   - `re_`로 시작하는지 확인

### 이메일이 발송되지 않는 경우

1. **Resend 대시보드 확인**
   - [Resend Dashboard](https://resend.com) → **"Logs"** 탭
   - 발송 시도 기록 및 에러 메시지 확인

2. **Railway 로그 확인**
   - Railway 대시보드 → 서비스 → **"Logs"** 탭
   - 에러 메시지 확인

3. **API 키 상태 확인**
   - Resend 대시보드 → **"API Keys"** 메뉴
   - API 키가 활성화되어 있는지 확인
   - Rate Limit에 도달하지 않았는지 확인

## 📋 Railway에 설정해야 할 모든 환경 변수 목록

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://bgnuyghvjkqgwwvghqzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role (선택사항 - 관리자 기능용)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application URL (선택사항)
NEXT_PUBLIC_APP_URL=https://your-app-name.up.railway.app

# Resend API Key (이메일 발송용)
RESEND_API_KEY=re_6kDHUGWP_QHKjjkd1ZhzsMGktWhCK38zE

# Node Environment (선택사항)
NODE_ENV=production
```

## 🔐 보안 주의사항

1. **절대 Git에 커밋하지 마세요**
   - `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다
   - API 키는 Railway의 환경 변수로만 관리하세요

2. **프로덕션 키 사용**
   - 개발용 키와 프로덕션용 키를 분리하는 것을 권장합니다
   - Resend 대시보드에서 프로덕션용 API 키를 별도로 생성할 수 있습니다

3. **키 권한 확인**
   - Resend API 키는 **"Send emails"** 권한만 있으면 됩니다
   - 불필요한 권한은 부여하지 마세요

## 📚 참고 자료

- [Railway 환경 변수 문서](https://docs.railway.app/develop/variables)
- [Resend 공식 문서](https://resend.com/docs)
- [Resend API 레퍼런스](https://resend.com/docs/api-reference/emails/send-email)

