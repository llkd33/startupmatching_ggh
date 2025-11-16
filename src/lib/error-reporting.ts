/**
 * 에러 리포팅 시스템
 * Sentry 통합 및 자체 로깅 API 지원
 */

import { AppError, ErrorSeverity, ErrorCategory } from './error-handler'
import { supabase } from './supabase'

interface ErrorReport {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  errorType: ErrorCategory
  errorCode?: string
  message: string
  stack?: string
  userAgent: string
  url: string
  severity: ErrorSeverity
  context?: Record<string, any>
}

/**
 * Sentry 통합 (선택적)
 */
let Sentry: any = null
let SentryInitialized = false

export async function initSentry() {
  if (SentryInitialized) return
  
  // Sentry는 선택적 의존성으로 처리
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      // 동적 import로 Sentry 로드 (빌드 시 에러 방지)
      // @ts-ignore - 선택적 의존성
      const SentryModule = await import('@sentry/nextjs').catch(() => null)
      if (!SentryModule) {
        if (process.env.NODE_ENV === 'development') {
          console.info('Sentry not installed. Using fallback error reporting.')
        }
        SentryInitialized = true
        return
      }
      Sentry = SentryModule
      
      if (Sentry.init) {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          beforeSend(event: any, hint: any) {
            // 민감한 정보 필터링
            if (event.request) {
              delete event.request.cookies
              delete event.request.headers?.authorization
            }
            return event
          },
        })
        SentryInitialized = true
      }
    } catch (error) {
      // Sentry 패키지가 설치되지 않은 경우 무시
      if (process.env.NODE_ENV === 'development') {
        console.info('Sentry not installed. Using fallback error reporting.')
      }
    }
  }
}

/**
 * 자체 로깅 API로 에러 전송
 */
async function sendToLoggingAPI(errorReport: ErrorReport): Promise<void> {
  try {
    // 자체 API 엔드포인트 사용
    const apiUrl = process.env.NEXT_PUBLIC_ERROR_LOGGING_API || '/api/errors/log'
    
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...errorReport,
        timestamp: errorReport.timestamp.toISOString(),
      }),
    }).catch(() => {
      // 네트워크 에러는 무시 (오프라인 상황 등)
    })
  } catch (error) {
    // 로깅 실패는 조용히 처리 (무한 루프 방지)
    if (process.env.NODE_ENV === 'development') {
      console.warn('에러 리포팅 실패:', error)
    }
  }
}

/**
 * 에러 리포팅 메인 함수
 */
export async function reportError(
  error: AppError | Error,
  context?: Record<string, any>
): Promise<void> {
  // AppError로 변환
  let appError: AppError
  if (error instanceof AppError) {
    appError = error
  } else {
    appError = new AppError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      undefined,
      { originalError: error },
      {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
      }
    )
  }

  // 사용자 정보 가져오기
  let userId: string | undefined
  try {
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id
  } catch {
    // 인증 정보 가져오기 실패는 무시
  }

  // 세션 ID 가져오기
  let sessionId = sessionStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('session_id', sessionId)
  }

  // 에러 리포트 생성
  const errorReport: ErrorReport = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    userId,
    sessionId,
    errorType: appError.category,
    errorCode: appError.code,
    message: appError.message,
    stack: appError.stack || error.stack,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    url: typeof window !== 'undefined' ? window.location.href : '',
    severity: appError.severity,
    context: {
      ...context,
      details: appError.details,
      status: appError.status,
      retry: appError.retry,
    },
  }

  // Sentry로 전송 (가능한 경우)
  if (Sentry && typeof window !== 'undefined') {
    try {
      Sentry.captureException(error, {
        tags: {
          category: appError.category,
          severity: appError.severity,
          code: appError.code,
          status: appError.status?.toString(),
        },
        extra: errorReport.context,
        user: userId ? { id: userId } : undefined,
        level: appError.severity === ErrorSeverity.CRITICAL ? 'fatal' :
              appError.severity === ErrorSeverity.HIGH ? 'error' :
              appError.severity === ErrorSeverity.MEDIUM ? 'warning' : 'info',
      })
    } catch (sentryError) {
      console.warn('Sentry 전송 실패:', sentryError)
    }
  }

  // 프로덕션 환경에서 자체 로깅 API로 전송
  // 개발 환경에서도 테스트를 위해 전송 가능
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
    await sendToLoggingAPI(errorReport)
  }

  // 개발 환경에서는 콘솔에 상세 로그 출력
  if (process.env.NODE_ENV === 'development') {
    const logLevel = appError.severity === ErrorSeverity.CRITICAL ? 'error' :
                     appError.severity === ErrorSeverity.HIGH ? 'error' :
                     appError.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info'
    
    console[logLevel]('[Error Reporter]', {
      ...errorReport,
      timestamp: errorReport.timestamp.toISOString(),
    })
  }
}

/**
 * 사용자 피드백과 함께 에러 리포팅
 */
export async function reportErrorWithFeedback(
  error: AppError | Error,
  userFeedback?: string,
  context?: Record<string, any>
): Promise<void> {
  await reportError(error, {
    ...context,
    userFeedback,
  })
}

/**
 * 성능 메트릭 리포팅
 */
export function reportPerformanceMetric(
  name: string,
  duration: number,
  context?: Record<string, any>
): void {
  if (Sentry && typeof window !== 'undefined') {
    try {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: name,
        data: {
          duration,
          ...context,
        },
        level: 'info',
      })
    } catch (error) {
      // 무시
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${duration}ms`, context)
  }
}

