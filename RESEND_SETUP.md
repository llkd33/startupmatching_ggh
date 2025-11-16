# Resend API 설정 가이드

## 현재 상태 확인

Resend API는 이미 코드에 통합되어 있습니다:
- `src/app/api/send-email/route.ts` - 이메일 발송 API 라우트
- `src/lib/campaign-matching.ts` - 캠페인 매칭 및 제안서 승인/거절 시 이메일 발송
- `package.json` - `resend` 패키지 설치됨

## 설정 방법

### 1. Resend 계정 생성 및 API 키 발급

1. [Resend.com](https://resend.com)에 가입
2. 대시보드에서 API Keys 메뉴로 이동
3. "Create API Key" 클릭
4. API 키 복사 (형식: `re_xxxxxxxxxxxxx`)

### 2. 환경 변수 설정

`.env.local` 파일에 다음을 추가:

```bash
# Resend API Key (이메일 발송용)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# 선택사항: 내부 API 보안을 위한 시크릿
INTERNAL_API_SECRET=your-secret-key-here
```

### 3. 이메일 발신자 도메인 설정 (선택사항)

기본적으로 Resend는 `noreply@startupmatching.com` 형식을 사용합니다.

**프로덕션 환경에서는:**
1. Resend 대시보드에서 도메인 추가
2. DNS 레코드 설정 (SPF, DKIM, DMARC)
3. `.env.local`에서 `from` 주소 변경:

```bash
# .env.local
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## 이메일 발송 기능

### 자동 발송되는 이메일

1. **제안서 승인 시**
   - 승인된 전문가에게 축하 이메일 발송
   - 거절된 전문가들에게 정중한 거절 이메일 발송
   - `src/lib/proposal-management.ts`의 `acceptProposalAndRejectOthers` 함수에서 처리

2. **캠페인 매칭 시**
   - 매칭된 전문가들에게 프로젝트 알림 이메일 발송
   - `src/lib/campaign-matching.ts`의 `notifyMatchedExperts` 함수에서 처리

### 수동 발송 API

`/api/send-email` 엔드포인트를 통해 직접 이메일 발송 가능:

```typescript
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: '제목',
    html: '<h1>HTML 내용</h1>',
    from: 'noreply@startupmatching.com' // 선택사항
  })
})
```

## 문제 해결

### "RESEND_API_KEY is not set" 경고

**원인**: 환경 변수가 설정되지 않음

**해결**:
1. `.env.local` 파일에 `RESEND_API_KEY` 추가
2. 개발 서버 재시작 (`npm run dev`)

### 이메일이 발송되지 않음

**확인 사항**:
1. `RESEND_API_KEY`가 올바른지 확인
2. Resend 대시보드에서 API 키 상태 확인
3. 브라우저 콘솔에서 에러 메시지 확인
4. Resend 대시보드의 "Logs" 탭에서 발송 상태 확인

### Rate Limit 에러

**원인**: Resend 무료 플랜의 일일 발송 한도 초과

**해결**:
- Resend 플랜 업그레이드 또는
- 다음 날까지 대기

## 테스트

개발 환경에서 이메일 발송 테스트:

```bash
# .env.local에 RESEND_API_KEY 설정 후
npm run dev

# 제안서 승인 시 자동으로 이메일 발송됨
```

## 보안 주의사항

1. **절대 `.env.local`을 Git에 커밋하지 마세요**
2. 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요
3. `INTERNAL_API_SECRET`을 설정하여 내부 API 호출 보안 강화 권장

## 참고 자료

- [Resend 공식 문서](https://resend.com/docs)
- [Resend API 레퍼런스](https://resend.com/docs/api-reference/emails/send-email)

