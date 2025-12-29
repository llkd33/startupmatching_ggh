import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface AdminAuthResult {
  authorized: boolean
  user: { id: string; email?: string } | null
}

/**
 * 미들웨어에서 검증한 사용자 정보를 헤더에서 읽어와 재사용
 * 헤더가 없거나 유효하지 않으면 기존 방식으로 fallback
 */
export async function checkAdminAuth(req: NextRequest): Promise<AdminAuthResult> {
  // 미들웨어에서 설정한 헤더 확인
  const userId = req.headers.get('x-user-id')
  const userEmail = req.headers.get('x-user-email')
  const isAdmin = req.headers.get('x-is-admin')

  // 헤더에 관리자 정보가 있으면 재사용 (DB 조회 생략)
  if (userId && isAdmin === 'true') {
    return {
      authorized: true,
      user: {
        id: userId,
        email: userEmail || undefined
      }
    }
  }

  // 헤더가 없거나 유효하지 않으면 기존 방식으로 fallback
  // (클라이언트에서 직접 호출하는 경우 등)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || ''
        }
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { authorized: false, user: null }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    return { authorized: false, user: null }
  }

  return { authorized: true, user }
}

