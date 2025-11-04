import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

// Supabase Admin Client 생성 (환경 변수 검증 포함)
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null
  let createdUserId: string | null = null

  try {
    // 0. Supabase Admin 클라이언트 생성 (환경 변수 검증)
    try {
      supabaseAdmin = createSupabaseAdmin()
    } catch (envError: any) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Environment variable error:', envError)
      }
      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      )
    }

    // 1. 관리자 인증 확인
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', user.id)
      .single()

    if (!userData || (!userData.is_admin && userData.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const { email, name, organization_name, position, phone, role } = body

    // 3. 필수 필드 검증
    if (!email || !name || !phone || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, phone, role' },
        { status: 400 }
      )
    }

    if (role !== 'expert' && role !== 'organization') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "expert" or "organization"' },
        { status: 400 }
      )
    }

    // 4. 이메일 중복 확인
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (existingUser?.user) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // 5. 전화번호를 비밀번호로 변환 (하이픈 제거)
    const password = phone.replace(/-/g, '')

    // 6. Supabase Admin API로 사용자 생성
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 없이 바로 활성화
      user_metadata: {
        role,
        name,
        phone,
        organization_name,
        position,
        invited: true,
        invited_by: user.id
      }
    })

    if (createError || !authData.user) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating user:', createError)
      }
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id
    createdUserId = userId // 롤백을 위해 저장

    // 7. users 테이블에 레코드 생성 (트리거가 없을 경우를 대비)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        role,
        phone
      }, { onConflict: 'id' })

    if (userError) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating user record:', userError)
      }
      // 사용자는 생성되었으므로 계속 진행
    }

    // 8. 프로필 테이블에 레코드 생성
    if (role === 'organization') {
      const { error: orgError } = await supabaseAdmin
        .from('organization_profiles')
        .upsert({
          user_id: userId,
          organization_name: organization_name || name,
          representative_name: name,
          contact_position: position || null,
          is_profile_complete: false
        }, { onConflict: 'user_id' })

      if (orgError) {
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error('Error creating organization profile:', orgError)
        }
        // 프로필 생성 실패 시 사용자 삭제 (롤백)
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
        } catch (deleteError) {
          // 개발 모드에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.error('Error deleting user after profile creation failure:', deleteError)
          }
        }
        return NextResponse.json(
          { error: 'Failed to create organization profile' },
          { status: 500 }
        )
      }
    } else {
      const { error: expertError } = await supabaseAdmin
        .from('expert_profiles')
        .upsert({
          user_id: userId,
          name,
          is_profile_complete: false
        }, { onConflict: 'user_id' })

      if (expertError) {
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error('Error creating expert profile:', expertError)
        }
        // 프로필 생성 실패 시 사용자 삭제 (롤백)
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
        } catch (deleteError) {
          // 개발 모드에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.error('Error deleting user after profile creation failure:', deleteError)
          }
        }
        return NextResponse.json(
          { error: 'Failed to create expert profile' },
          { status: 500 }
        )
      }
    }

    // 9. 초대 토큰 생성
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // 10. 초대 레코드 저장
    const { error: inviteError } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        email,
        name,
        organization_name: organization_name || null,
        position: position || null,
        phone,
        role,
        invited_by: user.id,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })

    if (inviteError) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating invitation:', inviteError)
      }
      // 초대 토큰 생성 실패는 치명적이지 않지만 로그 기록
      // 사용자는 생성되었으므로 계속 진행
    }

    // 11. 초대 이메일 발송
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/invite/accept/${token}`
    
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: `[${process.env.NEXT_PUBLIC_APP_NAME || 'StartupMatching'}] 초대가 도착했습니다`,
          html: generateInviteEmailHTML(name, inviteUrl, phone, organization_name || ''),
        }),
      })

      if (!emailResponse.ok) {
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to send invite email')
        }
        // 이메일 실패해도 사용자는 생성되었으므로 계속 진행
        // 하지만 성공 응답에 경고 포함
        return NextResponse.json({
          success: true,
          user: {
            id: userId,
            email,
            name,
            role
          },
          message: 'User created successfully, but invitation email failed to send. Please send the invite link manually.',
          warning: 'email_failed',
          inviteUrl: inviteUrl
        })
      }
    } catch (emailError) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending invite email:', emailError)
      }
      // 이메일 실패해도 사용자는 생성되었으므로 계속 진행
      // 하지만 성공 응답에 경고 포함
      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          email,
          name,
          role
        },
        message: 'User created successfully, but invitation email failed to send. Please send the invite link manually.',
        warning: 'email_failed',
        inviteUrl: inviteUrl
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        role
      },
      message: 'User invited successfully. Invitation email sent.'
    })

  } catch (error: any) {
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in invite-user API:', error)
    }

    // 부분 실패 시 롤백: 사용자가 생성되었지만 다른 단계에서 실패한 경우
    if (createdUserId && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId)
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('Rolled back user creation due to error')
        }
      } catch (rollbackError) {
        // 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error('Error during rollback:', rollbackError)
        }
        // 롤백 실패는 로그만 남기고 계속 진행
      }
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateInviteEmailHTML(name: string, inviteUrl: string, phone: string, organizationName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>초대장</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">초대가 도착했습니다! 🎉</h1>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요, <strong>${name}</strong>님!</p>
    
    ${organizationName ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>${organizationName}</strong>에서 초대해주셨습니다.</p>` : ''}
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      계정이 생성되었습니다. 아래 링크를 클릭하여 로그인하고 프로필을 완성해주세요.
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>로그인 정보:</strong></p>
      <p style="margin: 5px 0; font-size: 14px;">이메일: <strong>${name}</strong>님의 이메일 주소</p>
      <p style="margin: 5px 0; font-size: 14px;">비밀번호: <strong>${phone}</strong> (전화번호)</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        프로필 완성하러 가기 →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
      <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        이 링크는 7일간 유효합니다. 만료된 경우 관리자에게 문의해주세요.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

