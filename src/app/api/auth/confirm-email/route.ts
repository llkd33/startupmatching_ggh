import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
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
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Admin API로 이메일 확인 상태 업데이트
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        email_confirm: true
      }
    )

    if (error) {
      console.error('Error confirming email:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, user: data.user })
  } catch (error: any) {
    console.error('Exception confirming email:', error)
    return NextResponse.json(
      { error: 'Failed to confirm email' },
      { status: 500 }
    )
  }
}

