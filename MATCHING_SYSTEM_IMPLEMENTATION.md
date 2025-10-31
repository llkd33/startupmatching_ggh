# 자동 전문가 매칭 및 알림 시스템 구현 완료

## 개요

기관이 프로젝트(캠페인)를 업로드하면 관련 전문가를 자동으로 매칭하고, 이메일 알림을 전송하며, 선정/탈락 시 자동 이메일을 발송하는 완전한 시스템이 구현되었습니다.

## 시스템 플로우

### 1. 캠페인 생성 및 자동 매칭
```
기관이 캠페인 생성
  ↓
시스템이 자동으로 관련 전문가 검색
  ↓
매칭 점수 계산 (0-100점)
  ↓
알림 생성 및 이메일 발송
  ↓
전문가가 이메일 확인 후 제안서 제출
```

### 2. 제안서 검토 및 선정
```
기관이 제안서 검토
  ↓
전문가 선정 버튼 클릭
  ↓
확인 대화상자 표시 (경고 포함)
  ↓
선정 확정
  ↓
자동 처리:
  - 해당 제안서: 승인 처리
  - 다른 제안서들: 거절 처리
  - 캠페인 상태: "진행중"으로 변경
  - 선정된 전문가: 축하 이메일 발송
  - 탈락한 전문가들: 정중한 거절 이메일 발송
```

## 구현된 파일 및 기능

### 1. `/src/lib/campaign-matching.ts`
**핵심 매칭 엔진**

#### 주요 함수:

**`findMatchingExperts()`**
- 캠페인 정보를 기반으로 매칭되는 전문가 검색
- 필터링: 프로필 완성도, 활성 상태, 가용성
- 매칭 점수 계산 및 정렬

**`calculateMatchScore()`**
- 키워드/스킬 매칭: 최대 60점
- 지역 매칭: 최대 20점
- 예산 매칭: 최대 20점

**`notifyMatchedExperts()`**
- 데이터베이스에 알림 생성
- 이메일 전송 (새로운 매칭 프로젝트 안내)

**`sendSelectionResultEmails()`**
- 선정된 전문가: 축하 이메일
- 탈락한 전문가: 정중한 거절 이메일

**`handleCampaignCreated()`**
- 캠페인 생성 시 자동 실행되는 메인 함수
- 전체 매칭 프로세스 조율

#### 매칭 알고리즘:
```typescript
// 키워드/스킬 매칭 (60점)
const commonKeywords = campaignKeywords.filter(keyword =>
  expertSkills.some(skill =>
    skill.toLowerCase().includes(keyword.toLowerCase()) ||
    keyword.toLowerCase().includes(skill.toLowerCase())
  )
)
score += Math.min(commonKeywords.length * 20, 60)

// 지역 매칭 (20점)
if (campaignLocation && expertRegions.includes(campaignLocation)) {
  score += 20
}

// 예산 매칭 (20점)
if (expertHourlyRate && budgetMax) {
  const estimatedCost = expertHourlyRate * 40
  if (estimatedCost <= budgetMax) {
    score += 20
  } else if (estimatedCost <= budgetMax * 1.2) {
    score += 10
  }
}
```

### 2. `/src/lib/proposal-management.ts`
**제안서 승인/거절 관리**

#### 주요 함수:

**`acceptProposalAndRejectOthers()`**
```typescript
// 1. 해당 캠페인의 모든 pending 제안서 조회
// 2. 선택된 제안서 승인
// 3. 나머지 제안서 자동 거절
// 4. 캠페인 상태를 'in_progress'로 변경
// 5. 선정/탈락 이메일 발송 (백그라운드)
```

**`rejectProposal()`**
- 개별 제안서 거절
- 거절 사유 메시지 옵션
- 거절 이메일 자동 발송

**`bulkRejectProposals()`**
- 여러 제안서 일괄 거절

### 3. `/src/components/campaign/CampaignForm.tsx`
**캠페인 생성 폼 수정**

```typescript
// 캠페인 생성 성공 시
if (newCampaign && !isDraft) {
  toast.success('캠페인이 게시되었습니다. 매칭되는 전문가들에게 알림을 보내는 중입니다...')

  // 백그라운드에서 자동 매칭 처리
  handleCampaignCreated(newCampaign.id).catch(error => {
    console.error('Failed to process campaign matching:', error)
    // 매칭 실패해도 캠페인은 성공적으로 생성됨
  })
}
```

### 4. `/src/components/proposal/ProposalActions.tsx`
**제안서 승인/거절 UI 컴포넌트**

#### 기능:
- **승인 버튼**:
  - 확인 대화상자 표시
  - 중요 안내 섹션 (다른 제안서 자동 거절 경고)
  - 선택적 축하 메시지 입력
  - 처리 중 로딩 상태

- **거절 버튼**:
  - 확인 대화상자 표시
  - 선택적 거절 사유 입력
  - 정중한 피드백 권장 안내

#### 주요 특징:
```typescript
export function ProposalActions({
  proposalId,
  campaignId,
  expertName,
  onActionComplete,
}: ProposalActionsProps)
```

- Toast 알림으로 사용자 피드백
- 에러 처리 및 사용자 친화적 메시지
- 작업 완료 시 콜백 실행 (페이지 새로고침)

### 5. `/src/app/dashboard/proposals/page.tsx`
**제안서 목록 페이지 통합**

#### 수정 사항:
```typescript
// 기존 단순 버튼 제거
<Button onClick={() => handleProposalAction(proposal.id, 'accept')}>
  승인
</Button>

// 새로운 ProposalActions 컴포넌트 사용
<ProposalActions
  proposalId={proposal.id}
  campaignId={proposal.campaign_id}
  expertName={proposal.expert_profiles?.name || '전문가'}
  onActionComplete={handleActionComplete}
/>
```

## 이메일 템플릿

### 1. 매칭 알림 이메일
```html
<h2>새로운 프로젝트 매칭</h2>
<p>안녕하세요, {expertName}님</p>
<p>회원님의 전문 분야와 매칭되는 새로운 프로젝트가 있습니다!</p>

<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
  <h3>{campaignTitle}</h3>
  <p>{campaignDescription}</p>
  <p><strong>기관:</strong> {organizationName}</p>
  <p><strong>예산:</strong> {budgetRange}</p>
  <p><strong>매칭 점수:</strong> {matchScore}/100</p>
</div>

<a href="{campaignLink}" style="...">프로젝트 상세보기 및 제안서 제출</a>

<p>이 프로젝트는 회원님의 전문성과 높은 매칭률을 보여 선택되었습니다.</p>
```

### 2. 선정 축하 이메일
```html
<h2>축하합니다! 프로젝트에 선정되셨습니다 🎉</h2>
<p>안녕하세요, {expertName}님</p>
<p>"{campaignTitle}" 프로젝트의 전문가로 선정되셨습니다!</p>

<div style="background-color: #dcfce7; padding: 20px; border-radius: 8px;">
  <h3>다음 단계</h3>
  <ol>
    <li>기관 담당자와 연락하여 프로젝트 세부사항 논의</li>
    <li>프로젝트 일정 및 범위 확정</li>
    <li>계약서 작성 및 서명</li>
    <li>프로젝트 시작!</li>
  </ol>
</div>

{customMessage}

<a href="{projectLink}" style="...">프로젝트 대시보드 보기</a>
```

### 3. 탈락 안내 이메일
```html
<h2>프로젝트 결과 안내</h2>
<p>안녕하세요, {expertName}님</p>
<p>"{campaignTitle}" 프로젝트에 제안서를 제출해 주셔서 감사합니다.</p>

<p>신중한 검토 끝에, 이번에는 다른 전문가와 진행하기로 결정하였습니다.</p>

{customMessage}

<p>회원님의 훌륭한 제안에 다시 한 번 감사드리며,
   앞으로 더 적합한 프로젝트에서 뵙기를 기대합니다.</p>

<a href="{browseProjectsLink}" style="...">다른 프로젝트 둘러보기</a>
```

## 데이터베이스 활용

### 사용된 테이블:
- `campaigns`: 캠페인 정보 (keywords, category, budget)
- `expert_profiles`: 전문가 정보 (skills, service_regions, hourly_rate)
- `organization_profiles`: 기관 정보 (industry)
- `proposals`: 제안서 (status, response_message)
- `notifications`: 알림 (type: 'campaign_match')
- `users`: 사용자 정보 (email)

### 주요 쿼리 패턴:

**매칭 전문가 검색:**
```typescript
const { data: experts } = await supabase
  .from('expert_profiles')
  .select(`
    id,
    user_id,
    name,
    skills,
    service_regions,
    hourly_rate,
    profile_complete,
    is_available,
    users(email)
  `)
  .eq('profile_complete', true)
  .eq('is_available', true)
```

**제안서 일괄 업데이트:**
```typescript
// 선정된 제안서 승인
await supabase
  .from('proposals')
  .update({
    status: 'accepted',
    response_message: message,
    reviewed_at: new Date().toISOString(),
  })
  .eq('id', proposalId)

// 나머지 제안서 거절
await supabase
  .from('proposals')
  .update({
    status: 'rejected',
    response_message: '신중한 검토 끝에...',
    reviewed_at: new Date().toISOString(),
  })
  .in('id', rejectedProposalIds)
```

## 시스템 특징

### 1. 백그라운드 처리
- 매칭 및 이메일 발송은 비동기로 처리
- 캠페인 생성이 매칭 실패로 인해 중단되지 않음
- 사용자 경험 향상 (빠른 응답)

### 2. 에러 처리
```typescript
handleCampaignCreated(newCampaign.id).catch(error => {
  console.error('Failed to process campaign matching:', error)
  // 로그만 남기고 계속 진행
})
```

### 3. 사용자 피드백
- Toast 알림으로 즉각적인 피드백
- 진행 상황 안내 메시지
- 명확한 에러 메시지

### 4. 보안 및 권한
- RLS (Row Level Security) 정책 준수
- 기관 사용자만 승인/거절 가능
- 본인 소유 캠페인의 제안서만 관리 가능

## 확장 가능성

### 향후 추가 가능 기능:

1. **고급 매칭 알고리즘**
   - 머신러닝 기반 추천
   - 과거 성공 사례 학습
   - 전문가 평점 반영

2. **알림 시스템 확장**
   - 실시간 푸시 알림
   - SMS 알림
   - 인앱 알림 센터

3. **매칭 분석 대시보드**
   - 매칭 성공률 통계
   - 평균 응답 시간
   - 인기 키워드 분석

4. **자동 리마인더**
   - 제안서 미제출 전문가 리마인더
   - 검토 대기중 제안서 알림
   - 프로젝트 시작 전 확인

5. **A/B 테스트**
   - 이메일 제목 최적화
   - 매칭 알고리즘 개선
   - 전환율 향상

## 테스트 방법

### 1. 매칭 시스템 테스트
```typescript
// 캠페인 생성
// - 키워드: ['React', 'TypeScript', 'UI/UX']
// - 지역: '서울'
// - 예산: 5,000,000원

// 확인 사항:
// 1. 매칭되는 전문가들에게 이메일 발송 여부
// 2. notifications 테이블에 알림 생성 여부
// 3. 매칭 점수 계산 정확도
```

### 2. 선정/탈락 테스트
```typescript
// 제안서 승인
// 1. 제안서 목록에서 "승인" 버튼 클릭
// 2. 확인 대화상자에서 메시지 입력 (선택)
// 3. "선정 확정" 버튼 클릭

// 확인 사항:
// 1. 해당 제안서 상태: accepted
// 2. 다른 제안서들 상태: rejected
// 3. 캠페인 상태: in_progress
// 4. 선정된 전문가 이메일 수신
// 5. 탈락한 전문가들 이메일 수신
```

## 주의사항

### 환경 변수 필요:
```env
# 이메일 서비스 설정
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@startupmatching.com

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 이메일 발송 제한:
- 일일 발송 한도 확인
- 스팸 필터 회피 전략
- 발송 실패 시 재시도 로직

### 성능 고려사항:
- 대량 매칭 시 배치 처리
- 이메일 발송 큐 시스템
- 데이터베이스 인덱스 최적화

## 결론

완전한 자동 매칭 및 알림 시스템이 구현되었습니다. 기관이 프로젝트를 업로드하면 시스템이 자동으로 관련 전문가를 찾아 알림을 보내고, 선정 프로세스를 자동화하여 모든 관련자에게 적절한 이메일을 발송합니다.

이 시스템은 현재 데이터베이스 구조를 그대로 활용하며, 기존 기능과 완벽하게 통합됩니다.
