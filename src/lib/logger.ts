/**
 * 프로덕션 안전 로거
 * 개발 환경에서만 로그를 출력하고, 프로덕션에서는 구조화된 로깅만 수행
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * 개발 환경에서만 콘솔에 로그 출력
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log('[LOG]', ...args)
    }
  },

  /**
   * 개발 환경에서만 콘솔에 경고 출력
   * 프로덕션에서는 구조화된 로깅 서비스로 전송 (필요시)
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args)
    }
    // 프로덕션에서는 구조화된 로깅 서비스로 전송 가능
    // 예: Sentry, LogRocket 등
  },

  /**
   * 개발 환경에서만 콘솔에 에러 출력
   * 프로덕션에서는 구조화된 에러 로깅 서비스로 전송 (필요시)
   */
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args)
    }
    // 프로덕션에서는 구조화된 에러 로깅 서비스로 전송 가능
    // 예: Sentry, LogRocket 등
  },

  /**
   * 디버그 정보 (개발 환경에서만)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args)
    }
  },

  /**
   * 정보 로그 (중요한 정보만, 프로덕션에서도 출력 가능)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args)
    }
    // 프로덕션에서도 중요한 정보는 로깅 가능
  }
}
