/**
 * 캠페인 자동 매칭 및 알림 시스템
 *
 * 기능:
 * 1. 캠페인 생성 시 관련 전문가 자동 매칭
 * 2. 매칭된 전문가에게 알림 및 이메일 발송
 * 3. 전문가 선정 시 결과 이메일 발송
 */

import { supabase } from './supabase'

/**
 * Send email via API route (uses Resend)
 */
const sendEmail = async (emailData: {
  to: string
  subject: string
  html: string
  from?: string
}) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      
      // If email is skipped (not configured), just log and continue
      if (response.status === 503 && errorData.skipped) {
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.warn('Email sending skipped:', errorData.error)
        }
        return { success: false, skipped: true }
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to send email`)
    }

    return await response.json()
    } catch (error: any) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending email:', error)
      }
      
      // Don't throw if it's just a configuration issue
      if (error.message?.includes('not configured')) {
        return { success: false, skipped: true }
      }
      
      throw error
    }
}

export interface MatchedExpert {
  expert_id: string
  user_id: string
  name: string
  email: string
  skills: string[]
  match_score: number
  match_reasons: string[]
}

export interface CampaignMatchCriteria {
  keywords: string[]
  category: string
  industry?: string
  location?: string
  budget_min?: number
  budget_max?: number
}

/**
 * 캠페인과 매칭되는 전문가 찾기
 */
export async function findMatchingExperts(
  campaignId: string,
  criteria: CampaignMatchCriteria,
  limit: number = 50
): Promise<MatchedExpert[]> {
  try {
    // 1. 기본 매칭: keywords와 skills 비교
    const { data: experts, error } = await supabase
      .from('expert_profiles')
      .select(`
        id,
        user_id,
        name,
        skills,
        service_regions,
        hourly_rate,
        is_available,
        users!inner(email)
      `)
      .eq('is_available', true)
      .eq('is_profile_complete', true)

    if (error) throw error
    if (!experts || experts.length === 0) return []

    // 2. 매칭 스코어 계산
    const scoredExperts = experts
      .map((expert) => {
        const score = calculateMatchScore(expert, criteria)
        const reasons = generateMatchReasons(expert, criteria)

        return {
          expert_id: expert.id,
          user_id: expert.user_id,
          name: expert.name,
          email: (expert.users as any).email,
          skills: expert.skills || [],
          match_score: score,
          match_reasons: reasons,
        }
      })
      .filter((expert) => expert.match_score > 0) // 0점 이상만
      .sort((a, b) => b.match_score - a.match_score) // 점수 높은 순
      .slice(0, limit) // 상위 N명만

    return scoredExperts
  } catch (error) {
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Error finding matching experts:', error)
    }
    throw error
  }
}

/**
 * 매칭 스코어 계산 (0-100점)
 */
function calculateMatchScore(
  expert: any,
  criteria: CampaignMatchCriteria
): number {
  let score = 0
  const expertSkills = expert.skills || []
  const expertRegions = expert.service_regions || []

  // 1. 키워드 매칭 (최대 60점)
  const keywordMatches = criteria.keywords.filter((keyword) =>
    expertSkills.some((skill: string) =>
      skill.toLowerCase().includes(keyword.toLowerCase())
    )
  )
  score += Math.min((keywordMatches.length / criteria.keywords.length) * 60, 60)

  // 2. 지역 매칭 (최대 20점)
  if (criteria.location) {
    if (expertRegions.includes(criteria.location)) {
      score += 20
    } else if (expertRegions.includes('전국') || expertRegions.includes('원격')) {
      score += 15
    }
  }

  // 3. 예산 매칭 (최대 20점)
  if (criteria.budget_max && expert.hourly_rate) {
    // 시급이 예산 범위 내인 경우
    const estimatedCost = expert.hourly_rate * 160 // 월 기준 (주 40시간)
    if (estimatedCost <= criteria.budget_max) {
      score += 20
    } else if (estimatedCost <= criteria.budget_max * 1.2) {
      score += 10 // 20% 초과까지는 부분 점수
    }
  } else {
    score += 10 // 예산 정보 없으면 중간 점수
  }

  return Math.round(score)
}

/**
 * 매칭 이유 생성
 */
function generateMatchReasons(
  expert: any,
  criteria: CampaignMatchCriteria
): string[] {
  const reasons: string[] = []
  const expertSkills = expert.skills || []
  const expertRegions = expert.service_regions || []

  // 매칭된 기술
  const matchedSkills = criteria.keywords.filter((keyword) =>
    expertSkills.some((skill: string) =>
      skill.toLowerCase().includes(keyword.toLowerCase())
    )
  )

  if (matchedSkills.length > 0) {
    reasons.push(`보유 기술: ${matchedSkills.slice(0, 3).join(', ')}`)
  }

  // 지역 매칭
  if (criteria.location && expertRegions.includes(criteria.location)) {
    reasons.push(`활동 지역: ${criteria.location}`)
  } else if (expertRegions.includes('원격')) {
    reasons.push('원격 작업 가능')
  }

  // 예산 적합성
  if (criteria.budget_max && expert.hourly_rate) {
    const estimatedCost = expert.hourly_rate * 160
    if (estimatedCost <= criteria.budget_max) {
      reasons.push('예산 범위 내')
    }
  }

  return reasons
}

/**
 * 매칭된 전문가들에게 알림 및 이메일 발송
 */
export async function notifyMatchedExperts(
  campaignId: string,
  matchedExperts: MatchedExpert[],
  campaignData: {
    title: string
    description: string
    organization_name: string
    budget_range?: string
  }
): Promise<void> {
  try {
    // 1. DB 알림 생성 (일괄 처리)
    const notifications = matchedExperts.map((expert) => ({
      user_id: expert.user_id,
      type: 'campaign_match' as const,
      title: '새로운 프로젝트 매칭',
      content: `"${campaignData.title}" 프로젝트가 회원님의 전문 분야와 ${expert.match_score}% 일치합니다.`,
      data: {
        campaign_id: campaignId,
        match_score: expert.match_score,
        match_reasons: expert.match_reasons,
      },
      is_read: false,
    }))

    // Insert notifications via API to avoid RLS issues
    try {
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notifications }),
      })

      if (!response.ok) {
        const error = await response.json()
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error('Error creating notifications:', error)
        }
      }
    } catch (error) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating notifications:', error)
      }
    }

    // 2. 이메일 발송 (비동기, 실패해도 진행)
    await sendMatchNotificationEmails(matchedExperts, campaignData, campaignId)

    } catch (error) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error notifying matched experts:', error)
      }
      // 알림 실패해도 캠페인 생성은 성공
    }
}

/**
 * 매칭 알림 이메일 발송
 */
async function sendMatchNotificationEmails(
  experts: MatchedExpert[],
  campaignData: {
    title: string
    description: string
    organization_name: string
    budget_range?: string
  },
  campaignId: string
): Promise<void> {
  const emailPromises = experts.map(async (expert) => {
    try {
      await sendEmail({
        to: expert.email,
        subject: `${campaignData.organization_name}의 새 프로젝트 - ${expert.match_score}% 매칭`,
        html: generateMatchEmailHTML(expert, campaignData, campaignId),
      })
    } catch (error) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to send email to ${expert.email}:`, error)
      }
      // 개별 이메일 실패는 로그만 기록
    }
  })

  // 모든 이메일 발송 시도 (실패는 무시)
  await Promise.allSettled(emailPromises)
}

/**
 * 매칭 알림 이메일 HTML 생성
 */
function generateMatchEmailHTML(
  expert: MatchedExpert,
  campaignData: {
    title: string
    description: string
    organization_name: string
    budget_range?: string
  },
  campaignId: string
): string {
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
  const campaignUrl = `${platformUrl}/dashboard/campaigns/${campaignId}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
    .match-score { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .score-number { font-size: 36px; font-weight: bold; color: #3b82f6; }
    .reasons { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .reason-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .reason-item:last-child { border-bottom: none; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .campaign-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 새로운 프로젝트 매칭!</h1>
      <p>회원님의 전문성과 잘 맞는 프로젝트를 발견했습니다</p>
    </div>

    <div class="content">
      <p>안녕하세요, <strong>${expert.name}</strong>님!</p>

      <div class="match-score">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="color: #666; font-size: 14px; margin-bottom: 5px;">매칭도</div>
            <div class="score-number">${expert.match_score}%</div>
          </div>
          <div style="font-size: 48px;">🎯</div>
        </div>
      </div>

      <h2 style="color: #1f2937; margin-top: 30px;">📋 프로젝트 정보</h2>
      <div class="campaign-info">
        <h3 style="margin-top: 0; color: #92400e;">${campaignData.title}</h3>
        <p style="margin: 10px 0;"><strong>의뢰 기관:</strong> ${campaignData.organization_name}</p>
        ${campaignData.budget_range ? `<p style="margin: 10px 0;"><strong>예산 범위:</strong> ${campaignData.budget_range}</p>` : ''}
        <p style="margin: 10px 0; color: #666;">${campaignData.description.substring(0, 200)}${campaignData.description.length > 200 ? '...' : ''}</p>
      </div>

      <h3 style="color: #1f2937;">✨ 매칭 이유</h3>
      <div class="reasons">
        ${expert.match_reasons.map(reason => `
          <div class="reason-item">
            <span style="color: #3b82f6; margin-right: 8px;">✓</span>
            ${reason}
          </div>
        `).join('')}
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${campaignUrl}" class="button">
          프로젝트 자세히 보기 →
        </a>
      </div>

      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin-top: 0; color: #374151;">💡 다음 단계</h4>
        <ol style="margin: 10px 0; padding-left: 20px; color: #6b7280;">
          <li>프로젝트 상세 내용 확인</li>
          <li>관심 있으시면 제안서 작성</li>
          <li>기관의 응답 기다리기</li>
        </ol>
      </div>
    </div>

    <div class="footer">
      <p>이 이메일은 회원님의 프로필과 매칭되는 프로젝트를 자동으로 알려드립니다.</p>
      <p>알림 설정은 <a href="${platformUrl}/settings/notifications">여기</a>에서 변경하실 수 있습니다.</p>
      <p style="margin-top: 20px; color: #999;">© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * 전문가 선정 결과 이메일 발송
 */
export async function sendSelectionResultEmails(
  campaignId: string,
  selectedExpertId: string,
  rejectedProposalIds: string[]
): Promise<void> {
  try {
    // 1. 캠페인 및 제안서 정보 가져오기
    const { data: campaign } = await supabase
      .from('campaigns')
      .select(`
        *,
        organization_profiles(organization_name)
      `)
      .eq('id', campaignId)
      .single()

    if (!campaign) return

    // 2. 선정된 전문가에게 축하 이메일
    const { data: selectedProposal } = await supabase
      .from('proposals')
      .select(`
        *,
        expert_profiles(
          name,
          users(email)
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('expert_id', selectedExpertId)
      .eq('status', 'accepted')
      .single()

    const campaignOrganization = campaign.organization_profiles as { organization_name?: string | null } | null
    const organizationName = campaignOrganization?.organization_name || '기관'

    if (selectedProposal) {
      const expert = selectedProposal.expert_profiles as any
      await sendEmail({
        to: expert.users.email,
        subject: `🎉 축하합니다! "${campaign.title}" 프로젝트에 선정되셨습니다`,
        html: generateSelectionEmailHTML(
          expert.name,
          campaign.title,
          organizationName,
          campaignId,
          true
        ),
      })
    }

    // 3. 탈락한 전문가들에게 정중한 거절 이메일
    if (rejectedProposalIds.length > 0) {
      const { data: rejectedProposals } = await supabase
        .from('proposals')
        .select(`
          *,
          expert_profiles(
            name,
            users(email)
          )
        `)
        .in('id', rejectedProposalIds)
        .eq('status', 'rejected')

      if (rejectedProposals) {
        const rejectionEmails = rejectedProposals.map((proposal) => {
          const expert = proposal.expert_profiles as any
          return sendEmail({
            to: expert.users.email,
            subject: `"${campaign.title}" 프로젝트 결과 안내`,
            html: generateSelectionEmailHTML(
              expert.name,
              campaign.title,
              organizationName,
              campaignId,
              false,
              proposal.response_message || undefined
            ),
          })
        })

        await Promise.allSettled(rejectionEmails)
      }
    }
  } catch (error) {
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending selection result emails:', error)
    }
  }
}

/**
 * 선정/탈락 이메일 HTML 생성
 */
function generateSelectionEmailHTML(
  expertName: string,
  campaignTitle: string,
  organizationName: string,
  campaignId: string,
  isSelected: boolean,
  rejectionMessage?: string
): string {
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
  const campaignUrl = `${platformUrl}/dashboard/campaigns/${campaignId}`

  if (isSelected) {
    // 선정 이메일
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
    .celebration { font-size: 64px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .highlight { background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 축하합니다!</h1>
      <p style="font-size: 18px; margin-top: 10px;">프로젝트에 선정되셨습니다</p>
    </div>

    <div class="content">
      <div class="celebration">🎊✨🎉</div>

      <p>안녕하세요, <strong>${expertName}</strong>님!</p>

      <div class="highlight">
        <h3 style="margin-top: 0; color: #065f46;">선정 안내</h3>
        <p><strong>${organizationName}</strong>에서 회원님을 <strong>"${campaignTitle}"</strong> 프로젝트의 전문가로 선정하였습니다.</p>
      </div>

      <h3>📌 다음 단계</h3>
      <ol style="color: #4b5563; line-height: 2;">
        <li><strong>기관 담당자와 연락</strong>: 메시지를 통해 세부 사항을 협의하세요</li>
        <li><strong>계약 진행</strong>: 작업 범위, 일정, 금액을 확정하세요</li>
        <li><strong>프로젝트 시작</strong>: 멋진 결과물을 만들어주세요!</li>
      </ol>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${campaignUrl}" class="button">
          프로젝트 페이지로 이동 →
        </a>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;"><strong>💡 Tip:</strong> 프로젝트 진행 중 어려움이 있으시면 언제든지 플랫폼 고객지원팀에 문의해주세요.</p>
      </div>
    </div>

    <div class="footer">
      <p>다시 한번 축하드립니다! 성공적인 프로젝트를 기원합니다.</p>
      <p style="margin-top: 20px; color: #999;">© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  } else {
    // 탈락 이메일
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .message-box { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #6b7280; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>프로젝트 결과 안내</h1>
    </div>

    <div class="content">
      <p>안녕하세요, <strong>${expertName}</strong>님</p>

      <p><strong>"${campaignTitle}"</strong> 프로젝트에 제안서를 제출해 주셔서 감사합니다.</p>

      <p>신중한 검토 끝에, 이번에는 다른 전문가와 진행하기로 결정하였습니다. 회원님의 훌륭한 제안에도 불구하고 아쉬운 소식을 전하게 되어 죄송합니다.</p>

      ${rejectionMessage ? `
      <div class="message-box">
        <h4 style="margin-top: 0; color: #374151;">기관 메시지</h4>
        <p style="margin-bottom: 0; color: #6b7280;">${rejectionMessage}</p>
      </div>
      ` : ''}

      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h4 style="margin-top: 0; color: #1e40af;">🌟 다음 기회를 위한 제안</h4>
        <ul style="color: #1e3a8a; margin-bottom: 0;">
          <li>플랫폼에서 다른 프로젝트를 탐색해보세요</li>
          <li>프로필을 업데이트하여 매칭률을 높여보세요</li>
          <li>포트폴리오를 추가하여 경쟁력을 강화하세요</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${platformUrl}/dashboard/campaigns" class="button">
          다른 프로젝트 둘러보기 →
        </a>
      </div>

      <p style="margin-top: 30px; color: #6b7280;">회원님의 전문성을 높이 평가하고 있으며, 앞으로 더 적합한 프로젝트에서 뵙기를 기대합니다.</p>
    </div>

    <div class="footer">
      <p>언제나 회원님의 성공을 응원합니다!</p>
      <p style="margin-top: 20px; color: #999;">© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

/**
 * 캠페인 생성 시 자동으로 매칭 및 알림 처리
 */
export async function handleCampaignCreated(campaignId: string): Promise<void> {
  try {
    // 캠페인 생성 후 데이터베이스 반영을 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 최대 3번 재시도
    let campaign = null
    let error = null
    let retries = 3
    
    while (retries > 0 && !campaign) {
      const result = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles(organization_name)
        `)
        .eq('id', campaignId)
        .single()
      
      campaign = result.data
      error = result.error
      
      if (campaign) {
        break
      }
      
      if (retries > 1) {
        // 재시도 전 대기 시간 증가
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
      }
      
      retries--
    }

    if (error || !campaign) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to find campaign after retries:', campaignId, error)
      }
      return // 오류 발생 시 조용히 종료 (캠페인은 이미 생성됨)
    }

    // 2. 매칭 기준 설정
    const criteria: CampaignMatchCriteria = {
      keywords: campaign.keywords || [],
      category: campaign.category,
      location: campaign.location || undefined,
      budget_min: campaign.budget_min || undefined,
      budget_max: campaign.budget_max || undefined,
    }

    // 3. 매칭되는 전문가 찾기
    const matchedExperts = await findMatchingExperts(campaignId, criteria, 50)

    if (matchedExperts.length === 0) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('No matching experts found for campaign:', campaignId)
      }
      return
    }

    // 4. 알림 및 이메일 발송
    const campaignOrganization = campaign.organization_profiles as { organization_name?: string | null } | null

    await notifyMatchedExperts(campaignId, matchedExperts, {
      title: campaign.title,
      description: campaign.description,
      organization_name: campaignOrganization?.organization_name || '기관',
      budget_range: campaign.budget_min && campaign.budget_max
        ? `₩${campaign.budget_min.toLocaleString()} - ₩${campaign.budget_max.toLocaleString()}`
        : undefined,
    })

    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`Notified ${matchedExperts.length} experts for campaign:`, campaignId)
    }
  } catch (error) {
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handling campaign created:', error)
    }
    // 에러 발생해도 캠페인 생성은 성공한 상태
  }
}
