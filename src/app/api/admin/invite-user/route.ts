import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'
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
      logger.error('Environment variable error:', envError)
      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      )
    }

    // 1. 관리자 인증 확인 (공통 함수 사용)
    const authResult = await checkAdminAuth(request)
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authResult.user

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const { email, phone, name, role, organization_name, position } = body

    // 3. 필수 필드 검증
    if (!email || !phone || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, phone, name, role' },
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

    // 이메일 중복 확인 및 가입 완료 여부 확인
    let existingUser = null
    let existingUserRecord = null
    
    try {
      // auth.users에서 사용자 확인
      if (typeof supabaseAdmin.auth.admin.getUserByEmail === 'function') {
        const result = await supabaseAdmin.auth.admin.getUserByEmail(email)
        existingUser = result.data
      } else {
        // getUserByEmail이 없는 경우 listUsers로 검색
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const found = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        if (found) {
          existingUser = { user: found }
        }
      }
      
      // public.users에서 사용자 레코드 확인 (가입 완료 여부 확인)
      if (existingUser?.user) {
        const { data: userRecord } = await supabaseAdmin
          .from('users')
          .select('id, role, email')
          .eq('email', email.toLowerCase())
          .maybeSingle()
        
        existingUserRecord = userRecord
      }
    } catch (err) {
      // 에러 무시하고 계속 진행
    }
    
    // 사용자가 존재하는 경우
    if (existingUser?.user) {
      // 가입 완료한 사용자(role이 null이 아님)는 재초대 불가
      if (existingUserRecord && existingUserRecord.role) {
        return NextResponse.json(
          { error: '이미 가입 완료한 사용자입니다. 재초대할 수 없습니다.' },
          { status: 400 }
        )
      }
      
      // 초대만 하고 가입 안 한 사용자는 재초대 가능 (기존 사용자 삭제 후 재초대)
      // 또는 기존 초대 상태 확인 후 재초대 가능하도록 처리
      return NextResponse.json(
        { error: '이미 초대된 사용자입니다. 기존 초대를 삭제한 후 다시 초대해주세요.' },
        { status: 400 }
      )
    }

    // 5. 전화번호를 비밀번호로 변환 (하이픈 제거)
    const password = phone.replace(/-/g, '')

    // 6. 초대 토큰 생성 (사용자 생성 전에)
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // 7. Supabase Admin API로 사용자 생성 (역할 없이, 이메일 미확인 상태로)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 가입 완료 이메일을 보내기 위해 먼저 확인 상태로
      user_metadata: {
        phone,
        invited: true,
        invited_by: user.id,
        invite_token: token // 초대 토큰을 메타데이터에 저장
      }
    })

    if (createError || !authData.user) {
      logger.error('Error creating user:', createError)
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id
    createdUserId = userId // 롤백을 위해 저장

    // 7. users 테이블에 레코드 생성 (역할 없이)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        role: null, // 역할은 나중에 사용자가 선택
        phone
      }, { onConflict: 'id' })

    if (userError) {
      logger.error('Error creating user record:', userError)
      // 사용자는 생성되었으므로 계속 진행
    }

    // 프로필 테이블은 역할 선택 후 생성하므로 여기서는 생성하지 않음

    // 8. 초대 레코드 저장
    const { error: inviteError } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        phone: phone.replace(/[^0-9]/g, ''),
        role: role,
        organization_name: organization_name?.trim() || null,
        position: position?.trim() || null,
        invited_by: user.id,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })

    if (inviteError) {
      // 초대 레코드 생성 실패는 치명적 오류
      logger.error('Error creating invitation record:', inviteError)
      const errorMessage = inviteError.message || inviteError.details || JSON.stringify(inviteError)
      throw new Error(`초대 레코드 생성 실패: ${errorMessage}`)
    }

    // 9. 초대 이메일 발송
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/invite/accept/${token}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    try {
      // Resend API 직접 호출 (서버 사이드에서)
      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) {
        logger.warn('RESEND_API_KEY is not set. Email sending skipped.')
        return NextResponse.json({
          success: true,
          user: {
            id: userId,
            email
          },
          message: 'User created successfully, but invitation email failed to send (RESEND_API_KEY not configured). Please send the invite link manually.',
          warning: 'email_failed',
          inviteUrl: inviteUrl
        })
      }

      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      const emailHtml = generateInviteEmailHTML(inviteUrl, email, phone, name, organization_name || '')
      
        // Resend 기본 도메인 사용 (도메인 검증 필요 시 RESEND_FROM_EMAIL 환경 변수 설정)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'StartupMatching <onboarding@resend.dev>'
        
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `[${process.env.NEXT_PUBLIC_APP_NAME || 'StartupMatching'}] 가입 초대가 도착했습니다`,
          html: emailHtml,
        })

      if (!emailResult.data || emailResult.error) {
        logger.error('Failed to send invite email:', emailResult.error)

        // Resend 테스트 계정 제한 확인
        const isTestAccountLimit = emailResult.error?.name === 'validation_error' &&
          emailResult.error?.message?.includes('testing emails')

        // 상세한 에러 로깅
        logger.debug('Resend API Error Details:', JSON.stringify(emailResult.error, null, 2))
        logger.debug('Resend API Key configured:', !!resendApiKey)
        logger.debug('From email:', process.env.RESEND_FROM_EMAIL || 'StartupMatching <onboarding@resend.dev>')
        logger.debug('To email:', email)

        const errorMessage = isTestAccountLimit
          ? 'Resend 테스트 계정 제한: 도메인 인증 후 모든 사용자에게 이메일을 보낼 수 있습니다.'
          : '이메일 발송에 실패했습니다. 초대 링크를 수동으로 전달해주세요.'

        return NextResponse.json({
          success: true,
          user: {
            id: userId,
            email
          },
          message: `초대가 생성되었습니다. ${errorMessage}`,
          warning: isTestAccountLimit ? 'test_account_limit' : 'email_failed',
          inviteUrl: inviteUrl,
          emailError: isTestAccountLimit ? 'Resend 도메인 인증 필요' : (emailResult.error?.message || 'Unknown error')
        })
      }

      logger.info('Invitation email sent successfully:', emailResult.data.id)
    } catch (emailError: any) {
      logger.error('Error sending invite email:', emailError)
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
    logger.error('Error in invite-user API:', error)

    // 부분 실패 시 롤백: 사용자가 생성되었지만 다른 단계에서 실패한 경우
    if (createdUserId && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId)
        logger.info('Rolled back user creation due to error')
      } catch (rollbackError) {
        logger.error('Error during rollback:', rollbackError)
        // 롤백 실패는 로그만 남기고 계속 진행
      }
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateInviteEmailHTML(
  inviteUrl: string, 
  email: string, 
  phone: string,
  name: string = '',
  organizationName: string = ''
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>가입 초대</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">가입 초대가 도착했습니다! 🎉</h1>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; margin-bottom: 20px; color: #333;">
        안녕하세요${name ? `, ${name}님` : ''}!
      </p>
      
      ${organizationName ? `<p style="font-size: 16px; margin-bottom: 20px; color: #666;"><strong>${organizationName}</strong>에서 가입 초대를 보내드립니다.</p>` : ''}
      
      <p style="font-size: 16px; margin-bottom: 30px; color: #666;">
        StartupMatching에 가입 초대가 도착했습니다. 아래 버튼을 클릭하여 가입을 완료해주세요.
      </p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${inviteUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
          가입 진행하기 →
        </a>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; font-weight: bold;">로그인 정보:</p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">이메일 (ID): <strong>${email}</strong></p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">비밀번호: <strong>${phone.replace(/-/g, '')}</strong> (전화번호)</p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
          💡 가입 완료 후 비밀번호를 변경하실 수 있습니다.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #999; margin: 0 0 10px 0;">
          링크가 작동하지 않으시나요? 아래 주소를 복사하여 브라우저에 붙여넣으세요:
        </p>
        <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 0;">
          ${inviteUrl}
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999; margin: 0;">
          ⏰ 이 초대 링크는 7일간 유효합니다. 만료된 경우 관리자에게 문의해주세요.
        </p>
      </div>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px;">
    <p style="font-size: 12px; color: #999; margin: 0;">
      이 이메일은 StartupMatching에서 발송되었습니다.<br>
      문의사항이 있으시면 관리자에게 연락해주세요.
    </p>
  </div>
</body>
</html>
  `
}

