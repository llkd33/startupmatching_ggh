import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * 에러 로깅 API 엔드포인트
 * 클라이언트에서 발생한 에러를 서버로 전송
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // 인증 확인 (선택적 - 익명 에러도 허용)
    const { data: { user } } = await supabase.auth.getUser()
    
    const errorData = await request.json()
    
    // 에러 데이터 검증
    if (!errorData.message || !errorData.timestamp) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 }
      )
    }

    // Supabase에 에러 로그 저장 (테이블이 있는 경우)
    try {
      const { error } = await supabase
        .from('error_logs')
        .insert({
          id: errorData.id || crypto.randomUUID(),
          user_id: user?.id || null,
          session_id: errorData.sessionId || null,
          error_type: errorData.errorType || 'unknown',
          error_code: errorData.errorCode || null,
          message: errorData.message,
          stack: errorData.stack || null,
          user_agent: errorData.userAgent || null,
          url: errorData.url || null,
          severity: errorData.severity || 'medium',
          context: errorData.context || {},
          created_at: errorData.timestamp,
        })

      if (error) {
        // 테이블이 없어도 에러를 던지지 않음
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error log insert failed:', error)
        }
      }
    } catch (dbError) {
      // DB 에러는 무시 (에러 로깅 실패로 인한 무한 루프 방지)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Database error logging failed:', dbError)
      }
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
    })
  } catch (error: any) {
    // 에러 로깅 API 자체의 에러는 조용히 처리
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logging API error:', error)
    }
    
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    )
  }
}

