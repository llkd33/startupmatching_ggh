/**
 * 공통 에러 메시지 상수
 * 일관된 에러 메시지를 제공하여 사용자 경험 개선
 */

export const ERROR_MESSAGES = {
  // 인증 관련
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  
  // 네트워크 관련
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  TIMEOUT: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  
  // 데이터 관련
  NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
  VALIDATION_ERROR: '입력한 정보를 확인해주세요.',
  DUPLICATE_ERROR: '이미 존재하는 데이터입니다.',
  
  // 작업 관련
  CREATE_FAILED: '생성에 실패했습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  DELETE_FAILED: '삭제에 실패했습니다.',
  OPERATION_FAILED: '작업을 완료할 수 없습니다.',
  
  // 관리자 관련
  ADMIN_ONLY: '관리자만 접근할 수 있습니다.',
  ADMIN_AUTH_FAILED: '관리자 인증에 실패했습니다.',
} as const

export const SUCCESS_MESSAGES = {
  CREATED: '성공적으로 생성되었습니다.',
  UPDATED: '성공적으로 수정되었습니다.',
  DELETED: '성공적으로 삭제되었습니다.',
  SAVED: '저장되었습니다.',
  SENT: '전송되었습니다.',
} as const

/**
 * 에러 타입에 따라 적절한 메시지 반환
 */
export function getErrorMessage(error: unknown, defaultMessage?: string): string {
  if (error instanceof Error) {
    // 네트워크 에러
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
    
    // 타임아웃 에러
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return ERROR_MESSAGES.TIMEOUT
    }
    
    // 인증 에러
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      return ERROR_MESSAGES.UNAUTHORIZED
    }
    
    // 권한 에러
    if (error.message.includes('Forbidden') || error.message.includes('403')) {
      return ERROR_MESSAGES.FORBIDDEN
    }
    
    // 서버 에러
    if (error.message.includes('500') || error.message.includes('Internal')) {
      return ERROR_MESSAGES.SERVER_ERROR
    }
    
    // 찾을 수 없음
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return ERROR_MESSAGES.NOT_FOUND
    }
    
    // 사용자 친화적인 메시지가 있으면 반환
    if (error.message && !error.message.includes('Error') && !error.message.includes('Failed')) {
      return error.message
    }
  }
  
  return defaultMessage || ERROR_MESSAGES.OPERATION_FAILED
}

/**
 * API 응답에서 에러 메시지 추출
 */
export function extractApiErrorMessage(response: any): string {
  if (response?.error) {
    if (typeof response.error === 'string') {
      return response.error
    }
    if (response.error?.message) {
      return response.error.message
    }
  }
  
  return ERROR_MESSAGES.OPERATION_FAILED
}

