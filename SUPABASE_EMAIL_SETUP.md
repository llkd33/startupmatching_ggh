# 📧 Supabase 이메일 알림 설정 가이드

## 1. Supabase SQL Editor에서 실행

먼저 아래 SQL을 실행하여 이메일 알림 시스템을 설정하세요:

```sql
-- supabase/email_notifications.sql 파일의 전체 내용을 실행
```

## 2. Supabase Dashboard 이메일 설정

### Authentication → Email Templates

Supabase Dashboard에서 이메일 템플릿을 설정합니다:

1. **Supabase Dashboard** → **Authentication** → **Email Templates**
2. 다음 템플릿들을 추가/수정:

#### 연결 요청 알림 템플릿
**Template Name**: `connection_request`
```html
<h2>새로운 연결 요청이 있습니다!</h2>
<p>안녕하세요 {{ .expert_name }}님,</p>
<p><strong>{{ .organization_name }}</strong>에서 연결 요청을 보냈습니다.</p>
<p>캠페인: <strong>{{ .campaign_title }}</strong></p>
<br>
<p><a href="https://startupmatching.vercel.app/dashboard/notifications" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">요청 확인하기</a></p>
```

#### 연결 승인 알림 템플릿  
**Template Name**: `request_approved`
```html
<h2>연결 요청이 승인되었습니다!</h2>
<p>안녕하세요 {{ .organization_name }}님,</p>
<p><strong>{{ .expert_name }}</strong>님이 연결 요청을 승인했습니다.</p>
<p>캠페인: <strong>{{ .campaign_title }}</strong></p>
<br>
<p><a href="https://startupmatching.vercel.app/dashboard/messages" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">메시지 보내기</a></p>
```

#### 연결 거절 알림 템플릿
**Template Name**: `request_rejected`
```html
<h2>연결 요청 결과</h2>
<p>안녕하세요 {{ .organization_name }}님,</p>
<p><strong>{{ .expert_name }}</strong>님이 연결 요청을 거절했습니다.</p>
<p>캠페인: <strong>{{ .campaign_title }}</strong></p>
<br>
<p><a href="https://startupmatching.vercel.app/dashboard/experts" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">다른 전문가 찾기</a></p>
```

## 3. Supabase Database Webhook 설정

### Database → Webhooks

1. **New Webhook** 클릭
2. 다음 정보 입력:

**Name**: `send-email-notifications`
**Table**: `email_logs`
**Events**: `INSERT`
**Type**: `HTTP Request`

**URL**: Supabase의 내장 이메일 전송 엔드포인트
```
https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-email
```

**Headers**:
```json
{
  "Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]",
  "Content-Type": "application/json"
}
```

**Payload**:
```json
{
  "to": "{{ record.recipient_email }}",
  "subject": "{{ record.subject }}",
  "template": "{{ record.email_type }}",
  "data": {{ record.metadata }}
}
```

## 4. 간단한 이메일 발송 함수 (대안)

Webhook이 복잡하다면, 간단한 PostgreSQL 함수로 처리:

```sql
-- 이메일 발송 처리 함수 (pending 상태를 sent로 변경)
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void AS $$
DECLARE
    email_record RECORD;
BEGIN
    -- pending 상태의 이메일들을 처리
    FOR email_record IN 
        SELECT * FROM email_logs 
        WHERE status = 'pending' 
        ORDER BY sent_at ASC 
        LIMIT 10
    LOOP
        -- 여기서 실제 이메일 발송 로직이 실행됨
        -- Supabase는 자동으로 auth.email() 함수를 통해 이메일 발송
        
        -- 상태를 sent로 업데이트
        UPDATE email_logs 
        SET status = 'sent' 
        WHERE id = email_record.id;
        
        -- 로그
        RAISE NOTICE 'Email sent to: %', email_record.recipient_email;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 주기적으로 실행할 수 있는 함수
-- Supabase Dashboard에서 Cron Job으로 설정 가능
```

## 5. 테스트 방법

### SQL Editor에서 테스트:

```sql
-- 1. 테스트 사용자 생성
INSERT INTO users (id, email, role) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'expert@test.com', 'expert'),
  ('22222222-2222-2222-2222-222222222222', 'org@test.com', 'organization');

-- 2. 테스트 프로필 생성
INSERT INTO expert_profiles (user_id, name, is_available) 
VALUES ('11111111-1111-1111-1111-111111111111', '테스트 전문가', true);

INSERT INTO organization_profiles (user_id, organization_name, representative_name) 
VALUES ('22222222-2222-2222-2222-222222222222', '테스트 기관', '담당자');

-- 3. 연결 요청 생성 (자동으로 이메일 로그 생성됨)
INSERT INTO connection_requests (
    organization_id,
    expert_id,
    campaign_title,
    campaign_description
) VALUES (
    (SELECT id FROM organization_profiles WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    (SELECT id FROM expert_profiles WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    '테스트 캠페인',
    '테스트 설명'
);

-- 4. 이메일 로그 확인
SELECT * FROM email_logs ORDER BY sent_at DESC;

-- 5. 대기 중인 이메일 확인
SELECT * FROM pending_emails;
```

## 6. 프로덕션 설정

실제 이메일 발송을 위해서는:

1. **Supabase Dashboard** → **Settings** → **Auth**
2. **SMTP Settings** 활성화
3. SMTP 서버 정보 입력 (SendGrid, AWS SES, Gmail 등)

또는

1. **Supabase Edge Functions** 사용
2. **Resend**, **SendGrid** 등 이메일 서비스 API 연동

## 7. 모니터링

```sql
-- 이메일 발송 현황 확인
SELECT 
    email_type,
    status,
    COUNT(*) as count
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY email_type, status
ORDER BY email_type, status;

-- 실패한 이메일 확인
SELECT * FROM email_logs 
WHERE status = 'failed' 
ORDER BY sent_at DESC;
```

## 완료!

이제 기본적인 이메일 알림 시스템이 구축되었습니다. 사용자가 연결 요청을 보내거나 승인/거절할 때 자동으로 이메일 알림이 생성됩니다.