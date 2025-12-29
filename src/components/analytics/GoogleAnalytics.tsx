'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Type declarations for gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void
    dataLayer: unknown[]
  }
}

/**
 * Google Analytics 초기화 확인
 */
export function isGAEnabled(): boolean {
  return !!GA_MEASUREMENT_ID
}

/**
 * 페이지뷰 추적
 */
export function trackPageView(url: string) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return

  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  })
}

/**
 * 이벤트 추적
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
  additionalParams?: Record<string, unknown>
) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...additionalParams,
  })
}

/**
 * 사용자 ID 설정 (로그인 시)
 */
export function setUserId(userId: string) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return

  window.gtag('config', GA_MEASUREMENT_ID!, {
    user_id: userId,
  })
}

/**
 * 사용자 속성 설정
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return

  window.gtag('set', 'user_properties', properties)
}

// 페이지 추적 컴포넌트 (Suspense 내부)
function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isGAEnabled()) return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)
  }, [pathname, searchParams])

  return null
}

/**
 * Google Analytics 스크립트 컴포넌트
 */
export function GoogleAnalytics() {
  if (!isGAEnabled()) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              cookie_flags: 'SameSite=None;Secure'
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  )
}

// 미리 정의된 이벤트 추적 함수들
export const analytics = {
  // 인증 관련
  login: (method: string) => trackEvent('login', 'auth', method),
  signup: (method: string) => trackEvent('sign_up', 'auth', method),
  logout: () => trackEvent('logout', 'auth'),

  // 캠페인 관련
  viewCampaign: (campaignId: string, campaignTitle: string) =>
    trackEvent('view_campaign', 'campaign', campaignTitle, undefined, { campaign_id: campaignId }),
  createCampaign: (campaignId: string) =>
    trackEvent('create_campaign', 'campaign', campaignId),
  searchCampaign: (query: string, resultsCount: number) =>
    trackEvent('search', 'campaign', query, resultsCount),

  // 제안서 관련
  submitProposal: (campaignId: string) =>
    trackEvent('submit_proposal', 'proposal', campaignId),
  viewProposal: (proposalId: string) =>
    trackEvent('view_proposal', 'proposal', proposalId),
  acceptProposal: (proposalId: string) =>
    trackEvent('accept_proposal', 'proposal', proposalId),
  rejectProposal: (proposalId: string) =>
    trackEvent('reject_proposal', 'proposal', proposalId),

  // 전문가 관련
  viewExpert: (expertId: string, expertName: string) =>
    trackEvent('view_expert', 'expert', expertName, undefined, { expert_id: expertId }),
  searchExpert: (query: string, resultsCount: number) =>
    trackEvent('search', 'expert', query, resultsCount),
  contactExpert: (expertId: string) =>
    trackEvent('contact_expert', 'expert', expertId),

  // 메시지 관련
  sendMessage: (recipientType: 'expert' | 'organization') =>
    trackEvent('send_message', 'messaging', recipientType),
  attachFile: (fileType: string) =>
    trackEvent('attach_file', 'messaging', fileType),

  // 북마크 관련
  addBookmark: (targetType: string, targetId: string) =>
    trackEvent('add_bookmark', 'bookmark', targetType, undefined, { target_id: targetId }),
  removeBookmark: (targetType: string, targetId: string) =>
    trackEvent('remove_bookmark', 'bookmark', targetType, undefined, { target_id: targetId }),

  // 태스크 관련
  createTask: (taskId: string) =>
    trackEvent('create_task', 'task', taskId),
  completeTask: (taskId: string) =>
    trackEvent('complete_task', 'task', taskId),

  // 에러 관련
  error: (errorType: string, errorMessage: string) =>
    trackEvent('exception', 'error', `${errorType}: ${errorMessage}`),

  // 사용자 참여
  buttonClick: (buttonName: string, location: string) =>
    trackEvent('click', 'engagement', buttonName, undefined, { location }),
  formSubmit: (formName: string, success: boolean) =>
    trackEvent('form_submit', 'engagement', formName, success ? 1 : 0),

  // 성능 관련
  timing: (category: string, variable: string, value: number, label?: string) =>
    trackEvent('timing_complete', category, label || variable, value, {
      name: variable,
      value: value,
    }),
}

export default GoogleAnalytics
