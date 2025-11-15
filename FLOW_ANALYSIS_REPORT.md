# 전체 플로우 분석 보고서

## 📋 목차
1. [인증 및 회원가입 플로우](#1-인증-및-회원가입-플로우)
2. [캠페인 생성 및 매칭 플로우](#2-캠페인-생성-및-매칭-플로우)
3. [제안서 제출 및 검토 플로우](#3-제안서-제출-및-검토-플로우)
4. [메시징 및 알림 플로우](#4-메시징-및-알림-플로우)
5. [어드민 관리 플로우](#5-어드민-관리-플로우)
6. [발견된 문제점 및 개선 제안](#6-발견된-문제점-및-개선-제안)

---

## 1. 인증 및 회원가입 플로우

### 1.1 현재 구현 상태

#### 회원가입 흐름
```
사용자 → 역할 선택 (전문가/기관) → 이메일/비밀번호 입력
→ Supabase Auth 가입 → users 테이블 upsert
→ 프로필 생성 페이지 → 대시보드
```

#### 로그인 흐름
```
이메일/비밀번호 입력 → Supabase Auth 로그인
→ users 테이블 확인 (없으면 backfill API 호출)
→ 프로필 존재 확인 (expert_profiles, organization_profiles)
→ 여러 역할 있으면 선택 UI 표시
→ 프로필 완성 여부 확인
→ 대시보드 또는 프로필 완성 페이지
```

### 1.2 문제점

#### ❌ **Critical: Backfill API 에러 처리 불완전**
- 파일: `src/app/auth/login/page.tsx:104-172`
- 문제: 503/다른 에러 발생 시 로그만 출력하고 계속 진행
- 영향: users 테이블에 레코드 없이 진행 → 이후 RLS 실패 가능
- 해결: metadata role로 fallback은 좋지만, users 테이블 레코드 부재 시 다시 시도 필요

```typescript
// 현재 코드 (line 143-162)
if (backfillResponse.status === 503) {
  console.warn('Proceeding with user_metadata.role fallback')
  // Don't throw - allow login to proceed
} else {
  console.warn('Proceeding with user_metadata.role fallback')
  // Don't throw - allow login to proceed
}
```

**추천 개선안:**
```typescript
// users 테이블 없이 진행 시 클라이언트에서 재시도
const MAX_RETRIES = 3;
for (let i = 0; i < MAX_RETRIES; i++) {
  const { data: userCheck } = await browserSupabase
    .from('users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (userCheck) break;
  if (i < MAX_RETRIES - 1) {
    await new Promise(r => setTimeout(r, 1000));
    // Retry backfill
  }
}
```

#### ⚠️ **Medium: 다중 프로필 지원이 복잡함**
- 파일: `src/app/auth/login/page.tsx:192-272`
- 문제: 사용자가 expert_profiles와 organization_profiles 둘 다 가질 수 있음
- migration 018에서 명시적으로 허용: `018_allow_multiple_profiles_per_user.sql`
- 영향: 역할 전환 시 혼란 가능성, 데이터 일관성 이슈

**현재 처리:**
- 로그인 시 모든 프로필 확인 → 선택 UI 표시 ✅
- sessionStorage에 `current_role` 저장 ✅

**개선 제안:**
```typescript
// 1. 최근 사용 역할 기억
localStorage.setItem('last_used_role', role);

// 2. users 테이블에 현재 활성 역할 저장
await supabase
  .from('users')
  .update({ active_role: role })
  .eq('id', userId);

// 3. 역할 전환 UI 개선 (대시보드 헤더에 스위처 추가)
```

#### ⚠️ **Medium: 프로필 완성 강제 로직 부재**
- 문제: `is_profile_complete`가 false여도 대시보드 접근 가능
- 파일: `src/app/auth/login/page.tsx:336-340`
- 영향: 불완전한 프로필로 서비스 사용 → 매칭 품질 저하

**현재:**
```typescript
if (role === 'expert' && !profileComplete) {
  redirectPath = '/profile/expert/complete';
}
```

**개선 제안:**
```typescript
// 모든 프로필 필수 페이지에 미들웨어 추가
// middleware.ts
if (!profileComplete && !isProfileCompletionRoute) {
  return NextResponse.redirect('/profile/complete');
}
```

---

## 2. 캠페인 생성 및 매칭 플로우

### 2.1 현재 구현 상태

#### 캠페인 생성 흐름
```
기관 로그인 → 캠페인 생성 버튼
→ 템플릿 선택 (선택사항)
→ 3단계 폼 (기본정보/상세정보/추가정보)
→ 자동 저장 (3초 debounce)
→ 캠페인 게시
→ handleCampaignCreated() 백그라운드 호출
→ 매칭 전문가 찾기
→ 알림 및 이메일 발송
```

#### 매칭 로직
파일: `src/lib/campaign-matching.ts`

```typescript
findMatchingExperts(campaignId, criteria) →
  1. keywords ↔ skills 비교
  2. 매치 스코어 계산
  3. 상위 50명 선정
  →
notifyMatchedExperts() →
  각 전문가에게:
  - DB 알림 생성
  - 이메일 발송 (선택적)
```

### 2.2 문제점

#### ❌ **Critical: 매칭 실패 시 사용자에게 알림 없음**
- 파일: `src/components/campaign/CampaignForm.tsx:244-249`
```typescript
handleCampaignCreated(newCampaign.id).catch(error => {
  console.error('Failed to process campaign matching:', error);
  // 매칭 실패해도 캠페인은 성공적으로 생성됨
});
```

**문제:**
- 캠페인은 생성되었지만 전문가에게 알림이 안 감
- 사용자는 성공한 줄 알지만 실제로는 매칭 실패
- 캠페인이 inactive 상태로 남을 수 있음

**개선 제안:**
```typescript
try {
  await handleCampaignCreated(newCampaign.id);
  toast.success('캠페인이 게시되고 전문가들에게 알림이 발송되었습니다!');
} catch (error) {
  toast.warning('캠페인은 게시되었으나 일부 전문가에게 알림 발송 실패', {
    description: '대시보드에서 수동으로 전문가를 초대할 수 있습니다.',
    action: {
      label: '초대하기',
      onClick: () => router.push(`/dashboard/campaigns/${newCampaign.id}/invite`)
    }
  });
}
```

#### ⚠️ **Medium: 매칭 알고리즘이 단순함**
- 파일: `src/lib/campaign-matching.ts:87-140`
- 현재: keyword exact match만 사용
- 개선 가능:
  - 유사어 매칭 (예: "마케팅" ↔ "홍보")
  - 과거 성과 기반 랭킹
  - 전문가의 선호 카테고리
  - 지역 근접도

```typescript
// 추천 개선
function calculateMatchScore(campaign, expert) {
  let score = 0;

  // 1. 키워드 매칭 (40%)
  score += keywordMatch(campaign.keywords, expert.skills) * 0.4;

  // 2. 카테고리 매칭 (20%)
  score += categoryMatch(campaign.category, expert.categories) * 0.2;

  // 3. 과거 성과 (20%)
  score += expert.success_rate * 0.2;

  // 4. 위치 매칭 (10%)
  score += locationMatch(campaign.location, expert.location) * 0.1;

  // 5. 가용성 (10%)
  score += expert.is_available ? 0.1 : 0;

  return score;
}
```

#### ⚠️ **Medium: 이메일 전송 실패에 대한 fallback 부족**
- 파일: `src/lib/campaign-matching.ts:15-63`
- 문제: 이메일 서비스 미설정 시 경고만 출력
- 영향: 전문가가 알림을 못 받을 수 있음

**개선 제안:**
```typescript
// 이메일 실패 시 SMS fallback 또는 in-app 알림 강화
if (emailResult.skipped || !emailResult.success) {
  // Plan B: 인앱 알림을 더 강조
  await supabase.from('notifications').update({
    priority: 'high',
    requires_action: true
  }).eq('id', notificationId);

  // Plan C: 전문가 설정에 따라 SMS 발송
  if (expert.sms_notifications_enabled && expert.phone) {
    await sendSMS(expert.phone, notificationMessage);
  }
}
```

#### ✅ **Good: 캠페인 복제 기능 추가됨**
- 개선사항에서 추가함
- 기관 사용자가 이전 캠페인 복제 가능
- 시간 절약 및 일관성 유지

---

## 3. 제안서 제출 및 검토 플로우

### 3.1 현재 구현 상태

#### 제안서 제출 (전문가 → 기관)
```
전문가 → 캠페인 검색/탐색
→ 캠페인 상세 보기
→ 제안서 작성 (내용, 예상 비용, 예상 기간)
→ 제출
→ proposals 테이블에 저장
→ 기관에 알림 발송
```

#### 제안서 검토 (기관)
```
기관 대시보드 → 받은 제안서 목록
→ 필터링 (전체/제출됨/검토중/승인됨/거절됨/철회됨)
→ 개별 검토 또는 일괄 작업
→ 상태 업데이트 (승인/거절/검토중)
→ 전문가에 알림 발송
```

### 3.2 문제점

#### ✅ **Resolved: 일괄 작업 기능 추가됨**
- 개선사항에서 추가함
- 체크박스로 여러 제안서 선택
- 일괄 승인/거절/검토중 변경

#### ⚠️ **Medium: 제안서 상태 변경 시 롤백 메커니즘 부족**
- 파일: `src/components/proposal/ProposalList.tsx:126-188`
- 문제: 일괄 작업 중 일부 실패 시 이미 업데이트된 제안서는 롤백 안 됨

```typescript
// 현재 코드
for (const proposalId of selectedIds) {
  try {
    await db.proposals.updateStatus(proposalId, newStatus);
    // 성공
  } catch (err) {
    errors.push(`${proposalId}: ${err.message}`);
    // 실패했지만 이전 성공한 것들은 그대로
  }
}
```

**개선 제안:**
```typescript
// 트랜잭션 사용 (Supabase는 RPC 함수로 구현)
const { data, error } = await supabase.rpc('bulk_update_proposals', {
  proposal_ids: selectedIds,
  new_status: newStatus
});

// 또는 실패 시 자동 롤백 로직
const rollbackNeeded = errors.length > 0;
if (rollbackNeeded) {
  for (const successId of successIds) {
    await db.proposals.updateStatus(successId, originalStatus[successId]);
  }
}
```

#### ⚠️ **Medium: 제안서 승인 후 다음 단계 안내 부족**
- 문제: 제안서 승인 후 기관이 다음에 뭘 해야 할지 모름
- 영향: 워크플로우 중단, 사용자 이탈

**개선 제안:**
```typescript
// 제안서 승인 시
toast.success('제안서가 승인되었습니다!', {
  description: '전문가에게 메시지를 보내 프로젝트를 시작하세요.',
  action: {
    label: '메시지 보내기',
    onClick: () => router.push(`/dashboard/messages/${campaignId}`)
  }
});

// 또는 자동으로 다음 단계 위젯 표시
<NextStepsWidget
  step="proposal_approved"
  actions={[
    { label: '계약서 작성', href: '/contracts/create' },
    { label: '프로젝트 시작', href: '/projects/start' }
  ]}
/>
```

---

## 4. 메시징 및 알림 플로우

### 4.1 현재 구현 상태

#### 알림 시스템
파일: `src/lib/notifications.ts`, `src/app/api/notifications/create/route.ts`

```
이벤트 발생 (캠페인 생성, 제안서 제출, 상태 변경)
→ notifyXXX() 함수 호출
→ notifications 테이블에 레코드 생성
→ 이메일 발송 (선택적, /api/send-email)
→ 사용자 알림 배지 업데이트
```

#### 메시징 시스템
- Storage: `messages` 버킷 (migration 020, 021)
- 첨부 파일 지원
- RLS 정책 적용

### 4.2 문제점

#### ❌ **Critical: 알림 읽음 처리 로직 누락**
- `notifications` 테이블에 `read` 또는 `is_read` 컬럼 필요
- 현재: 알림은 생성되지만 읽음 표시 불가
- 영향: 알림 배지가 계속 증가, 사용자 경험 저하

**확인 필요:**
```sql
-- notifications 테이블에 read 컬럼이 있는지 확인
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'notifications';
```

**개선 제안:**
```sql
-- Migration 추가
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- API 엔드포인트 추가
POST /api/notifications/[id]/read
```

#### ⚠️ **Medium: 실시간 알림 부재**
- 현재: 페이지 새로고침해야 알림 확인 가능
- 개선: Supabase Realtime 사용

```typescript
// 추천 구현
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // 새 알림 표시
      toast.info(payload.new.message);
      setUnreadCount(prev => prev + 1);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

#### ⚠️ **Medium: 메시지 첨부 파일 크기 제한 미설정**
- 파일: migration `021_add_messages_storage_policies.sql`
- RLS 정책은 있지만 파일 크기 제한 없음
- 위험: 대용량 파일 업로드로 스토리지 비용 증가

**개선 제안:**
```typescript
// 클라이언트 측 검증
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_FILE_SIZE) {
  toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
  return;
}

// Storage bucket 설정에서도 제한
await supabase.storage.updateBucket('messages', {
  fileSizeLimit: 10485760 // 10MB in bytes
});
```

---

## 5. 어드민 관리 플로우

### 5.1 현재 구현 상태 (개선 후)

#### 사용자 관리
```
어드민 로그인 → /admin/users
→ 페이지네이션된 사용자 목록 (20명/페이지)
→ 필터/검색
→ 안전한 API (/api/admin/users) 사용
→ 관리자 권한 부여/해제
→ 기관 인증
→ 소프트 삭제
→ 감사 로그 기록
```

#### 통계 대시보드
```
어드민 대시보드 → /admin
→ 통합 API (/api/admin/stats) 호출
→ 8개 통계 카드 표시
→ 최근 활동 (캠페인, 제안서)
→ 에러 발생 시 부분 성공 표시
```

#### 감사 로그
```
어드민 → /admin/logs
→ 필터링 (액션, 중요도, 날짜)
→ 페이지네이션 (50개/페이지)
→ CSV 내보내기
```

### 5.2 문제점

#### ✅ **Resolved: 보안 강화 완료**
- 개선사항에서 Service Role Key 사용하는 API로 전환
- RLS 우회 방지
- 네트워크 탭에 쿼리 노출 방지

#### ⚠️ **Medium: 어드민 2FA 인증 부재**
- 문제: 관리자 계정은 강력한 보안 필요
- 현재: 이메일/비밀번호만으로 접근 가능
- 개선: TOTP (Google Authenticator) 등 2FA 추가

```typescript
// Supabase Auth에서 MFA 지원
await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

// 로그인 시 검증
await supabase.auth.mfa.verify({
  factorId: '...',
  code: userInputCode
});
```

#### ⚠️ **Low: 어드민 활동 IP 주소 기록 부족**
- 감사 로그에 IP 주소 저장하면 보안 강화
- 파일: `src/app/api/admin/users/route.ts`

```typescript
// headers에서 IP 추출
const ip = req.headers.get('x-forwarded-for') ||
           req.headers.get('x-real-ip') ||
           'unknown';

await adminClient.from('admin_logs').insert({
  admin_user_id: authResult.user.id,
  action: 'GRANT_ADMIN',
  entity_type: 'user',
  entity_id: userId,
  ip_address: ip,  // 추가
  user_agent: req.headers.get('user-agent'),  // 추가
  details: { ... }
});
```

---

## 6. 발견된 문제점 및 개선 제안 종합

### 6.1 Critical Issues (즉시 수정 필요)

| 문제 | 위치 | 영향 | 우선순위 |
|------|------|------|---------|
| Backfill API 실패 시 users 테이블 레코드 부재 | login/page.tsx:104 | RLS 정책 실패 가능 | 🔴 Critical |
| 캠페인 매칭 실패 시 사용자에게 알림 없음 | CampaignForm.tsx:244 | 전문가가 알림 못 받음 | 🔴 Critical |
| 알림 읽음 처리 로직 누락 | notifications 테이블 | 알림 배지 계속 증가 | 🔴 Critical |

### 6.2 High Priority Issues (곧 수정 필요)

| 문제 | 위치 | 영향 | 우선순위 |
|------|------|------|---------|
| 제안서 일괄 작업 트랜잭션 부족 | ProposalList.tsx:126 | 부분 실패 시 데이터 불일치 | 🟠 High |
| 실시간 알림 부재 | 전역 | 사용자 경험 저하 | 🟠 High |
| 프로필 완성 강제 로직 부족 | middleware | 불완전한 프로필로 서비스 사용 | 🟠 High |

### 6.3 Medium Priority Issues (개선 권장)

| 문제 | 위치 | 영향 | 우선순위 |
|------|------|------|---------|
| 매칭 알고리즘 단순함 | campaign-matching.ts | 매칭 품질 저하 | 🟡 Medium |
| 다중 프로필 UX 복잡함 | login/page.tsx:192 | 사용자 혼란 | 🟡 Medium |
| 이메일 fallback 부족 | campaign-matching.ts:15 | 알림 미전달 가능 | 🟡 Medium |
| 제안서 승인 후 안내 부족 | ProposalList | 워크플로우 중단 | 🟡 Medium |

### 6.4 Security Issues

| 문제 | 위치 | 영향 | 우선순위 |
|------|------|------|---------|
| 어드민 2FA 부재 | admin auth | 관리자 계정 보안 취약 | 🟠 High |
| 파일 크기 제한 미설정 | messages storage | 스토리지 비용 증가 | 🟡 Medium |
| IP 주소 로깅 부족 | admin logs | 감사 추적 불완전 | 🟢 Low |

---

## 7. 추천 개선 로드맵

### Phase 1: Critical Fixes (1-2주)
1. ✅ Backfill API 재시도 로직 추가
2. ✅ 캠페인 매칭 실패 처리 개선
3. ✅ 알림 읽음 처리 기능 추가

### Phase 2: High Priority (2-3주)
4. 제안서 일괄 작업 트랜잭션 구현
5. Supabase Realtime 알림 추가
6. 프로필 완성 미들웨어 추가

### Phase 3: Quality Improvements (4-6주)
7. 매칭 알고리즘 고도화
8. 다중 프로필 UX 개선
9. 워크플로우 안내 위젯 추가

### Phase 4: Security Hardening (ongoing)
10. 어드민 2FA 구현
11. 파일 업로드 제한 및 검증
12. 감사 로그 강화

---

## 8. 플로우 다이어그램

### 8.1 전체 사용자 여정

```
┌─────────────┐
│  홈페이지   │
└──────┬──────┘
       │
       ├─→ 전문가 가입 ─→ 프로필 작성 ─→ 캠페인 탐색 ─→ 제안서 제출 ─→ 메시징
       │
       └─→ 기관 가입 ─→ 프로필 작성 ─→ 캠페인 생성 ─→ 제안서 검토 ─→ 전문가 선정
```

### 8.2 데이터 흐름

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Users   │────▶│ Profiles │────▶│Campaigns │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │ Matching │
                                 └────┬─────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ Notifications │
                              └───────┬───────┘
                                      │
                                      ▼
                                ┌──────────┐
                                │Proposals │
                                └────┬─────┘
                                     │
                                     ▼
                               ┌──────────┐
                               │ Messages │
                               └──────────┘
```

---

## 결론

### 전반적 평가: **B+ (양호)**

**강점:**
- ✅ 핵심 기능 완성도 높음
- ✅ 보안 개선 (Service Role API 추가)
- ✅ UX 개선 (일괄 작업, 캠페인 복제)
- ✅ 에러 처리 개선

**약점:**
- ⚠️ 일부 critical path의 에러 처리 불완전
- ⚠️ 실시간 기능 부족
- ⚠️ 워크플로우 안내 부족

**우선 조치 항목:**
1. Backfill API 재시도 로직
2. 알림 읽음 처리
3. 캠페인 매칭 실패 UX
