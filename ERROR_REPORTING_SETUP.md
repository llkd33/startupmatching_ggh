# 에러 리포팅 시스템 설정 가이드

## 개요

에러 리포팅 시스템이 통합되었습니다. Sentry(선택적)와 자체 로깅 API를 지원합니다.

## 기능

1. **Sentry 통합** (선택적)
   - 프로덕션 환경에서 에러 추적
   - 사용자 컨텍스트 및 스택 트레이스 수집
   - 민감한 정보 자동 필터링

2. **자체 로깅 API**
   - `/api/errors/log` 엔드포인트로 에러 수집
   - Supabase `error_logs` 테이블에 저장 (선택적)
   - 오프라인 상황에서도 로컬 스토리지에 저장

3. **에러 분류 및 심각도**
   - 카테고리: Authentication, Authorization, Validation, Network, Database, Server, Client, Unknown
   - 심각도: Low, Medium, High, Critical

## 설정 방법

### 1. Sentry 사용 (선택적)

```bash
npm install @sentry/nextjs
```

환경 변수 설정:
```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### 2. 자체 로깅 API 사용

기본적으로 `/api/errors/log` 엔드포인트를 사용합니다.

커스텀 API 엔드포인트 사용:
```env
NEXT_PUBLIC_ERROR_LOGGING_API=https://your-api.com/errors/log
```

개발 환경에서도 로깅 활성화:
```env
NEXT_PUBLIC_ENABLE_ERROR_LOGGING=true
```

### 3. Supabase 에러 로그 테이블 생성 (선택적)

```sql
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  error_type TEXT NOT NULL,
  error_code TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  user_agent TEXT,
  url TEXT,
  severity TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
```

## 사용 방법

에러는 자동으로 리포팅됩니다:

```typescript
import { handleSupabaseError } from '@/lib/error-handler'

try {
  // 코드 실행
} catch (error) {
  handleSupabaseError(error, true, { context: 'your_context' })
}
```

수동으로 에러 리포팅:

```typescript
import { reportError } from '@/lib/error-reporting'
import { AppError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

const error = new AppError(
  'Something went wrong',
  'CUSTOM_ERROR',
  500,
  { additionalData: 'value' },
  {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
  }
)

await reportError(error, { context: 'additional_context' })
```

## 에러 로그 확인

### 로컬 스토리지
브라우저 개발자 도구에서:
```javascript
JSON.parse(localStorage.getItem('error_logs'))
```

### Supabase
```sql
SELECT * FROM error_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

### Sentry
Sentry 대시보드에서 확인 가능합니다.

## 주의사항

1. **무한 루프 방지**: 에러 리포팅 실패는 조용히 처리됩니다.
2. **민감한 정보**: 자동으로 쿠키 및 인증 헤더가 필터링됩니다.
3. **성능**: 프로덕션 환경에서만 자동 리포팅이 활성화됩니다 (개발 환경에서는 콘솔 로그만).

