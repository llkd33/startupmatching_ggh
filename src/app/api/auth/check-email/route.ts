import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Supabase Admin API로 이메일 존재 여부 확인
    const { data: existingUser, error } = await supabaseAdmin.auth.admin.getUserByEmail(email)

    if (error) {
      // 사용자를 찾을 수 없는 경우 (404)는 정상적인 경우
      if (error.message?.includes('not found') || error.status === 404) {
        return NextResponse.json({ exists: false })
      }

      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking email:', error)
      }

      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      )
    }

    // 사용자가 존재하는 경우
    if (existingUser?.user) {
      // 사용자 역할 정보도 함께 반환
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', existingUser.user.id)
        .single()

      return NextResponse.json({
        exists: true,
        role: userData?.role || null,
      })
    }

    return NextResponse.json({ exists: false })
  } catch (error: any) {
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected error checking email:', error)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

