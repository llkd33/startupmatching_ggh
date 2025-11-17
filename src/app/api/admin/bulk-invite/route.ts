import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

interface InviteUser {
  email: string
  name: string
  phone: string
  role: 'expert' | 'organization'
  organization_name?: string
  position?: string
}

export async function POST(request: NextRequest) {
  let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null

  try {
    // 0. Supabase Admin 클라이언트 생성
    try {
      supabaseAdmin = createSupabaseAdmin()
    } catch (envError: any) {
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
    const { users } = body

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: users array is required' },
        { status: 400 }
      )
    }

    if (users.length > 100) {
      return NextResponse.json(
        { error: 'Too many users. Maximum 100 users per batch.' },
        { status: 400 }
      )
    }

    // 3. 일괄 초대 처리
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const inviteUser of users) {
      try {
        const { email, name, phone, role, organization_name, position } = inviteUser

        // 필수 필드 검증
        if (!email || !name || !phone || !role) {
          results.failed++
          results.errors.push({
            email: email || 'unknown',
            error: 'Missing required fields'
          })
          continue
        }

        // 이메일 중복 확인
        let existingUser = null
        try {
          if (typeof supabaseAdmin!.auth.admin.getUserByEmail === 'function') {
            const result = await supabaseAdmin!.auth.admin.getUserByEmail(email)
            existingUser = result.data
          } else {
            // getUserByEmail이 없는 경우 listUsers로 검색
            const { data: { users } } = await supabaseAdmin!.auth.admin.listUsers()
            const found = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
            if (found) {
              existingUser = { user: found }
            }
          }
        } catch (err) {
          // 에러 무시하고 계속 진행
        }
        
        if (existingUser?.user) {
          results.failed++
          results.errors.push({
            email,
            error: 'User already exists'
          })
          continue
        }

        // 전화번호를 비밀번호로 변환 (하이픈 제거)
        const password = phone.replace(/[^0-9]/g, '')

        // 사용자 생성 (기존 invite-user API와 동일한 방식)
        const { data: authData, error: createError } = await supabaseAdmin!.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password,
          email_confirm: true, // 이메일 인증 없이 바로 활성화
          user_metadata: {
            role,
            name: name.trim(),
            phone: phone.replace(/[^0-9]/g, ''),
            organization_name: organization_name?.trim() || null,
            position: position?.trim() || null,
            invited: true,
            invited_by: user.id
          }
        })

        if (createError || !authData.user) {
          results.failed++
          results.errors.push({
            email,
            error: createError?.message || 'Failed to create user'
          })
          continue
        }

        const userId = authData.user.id

        // users 테이블에 레코드 생성
        await supabaseAdmin!
          .from('users')
          .upsert({
            id: userId,
            email: email.toLowerCase().trim(),
            role,
            phone: phone.replace(/[^0-9]/g, '')
          }, { onConflict: 'id' })

        // 프로필 테이블에 레코드 생성
        if (role === 'organization') {
          await supabaseAdmin!
            .from('organization_profiles')
            .upsert({
              user_id: userId,
              organization_name: organization_name?.trim() || '',
              representative_name: name.trim(),
              contact_position: position?.trim() || null,
              is_profile_complete: false
            }, { onConflict: 'user_id' })
        } else {
          await supabaseAdmin!
            .from('expert_profiles')
            .upsert({
              user_id: userId,
              name: name.trim(),
              is_profile_complete: false
            }, { onConflict: 'user_id' })
        }

        // 초대 토큰 생성
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

        // 초대 레코드 생성
        const { error: inviteError } = await supabaseAdmin!
          .from('user_invitations')
          .insert({
            email: email.toLowerCase().trim(),
            name: name.trim(),
            phone: phone.replace(/[^0-9]/g, ''),
            role,
            organization_name: organization_name?.trim() || null,
            position: position?.trim() || null,
            invited_by: user.id,
            token,
            expires_at: expiresAt.toISOString(),
            status: 'pending'
          })

        if (inviteError) {
          // 초대 레코드 생성 실패는 치명적이지 않지만 로그 기록
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to create invitation record for ${email}:`, inviteError)
          }
        }

        // 초대 이메일 발송 (재시도 로직 포함)
        const inviteUrl = `${appUrl}/auth/invite/accept/${token}`
        
        const sendEmailWithRetry = async (retries = 3): Promise<boolean> => {
          for (let i = 0; i < retries; i++) {
            try {
              const emailResponse = await fetch(`${appUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: email,
                  subject: `[${process.env.NEXT_PUBLIC_APP_NAME || 'StartupMatching'}] 초대가 도착했습니다`,
                  html: generateInviteEmailHTML(name, email, inviteUrl, phone, organization_name || ''),
                }),
              })

              if (emailResponse.ok) {
                return true
              }
              
              // 마지막 시도가 아니면 잠시 대기 후 재시도
              if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
              }
            } catch (emailError) {
              if (i === retries - 1) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`Error sending invite email to ${email} after ${retries} retries:`, emailError)
                }
                return false
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
            }
          }
          return false
        }

        try {
          const emailSent = await sendEmailWithRetry()
          if (!emailSent && process.env.NODE_ENV === 'development') {
            console.warn(`Failed to send invite email to ${email} after retries`)
          }
          // 이메일 실패해도 초대는 생성되었으므로 성공으로 처리
        } catch (emailError) {
          // 이메일 실패해도 초대는 생성되었으므로 성공으로 처리
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Error sending invite email to ${email}:`, emailError)
          }
        }

        results.success++

      } catch (err: any) {
        results.failed++
        results.errors.push({
          email: inviteUser.email || 'unknown',
          error: err.message || 'Unknown error'
        })
      }
    }

    // 일괄 작업 전체를 하나의 로그로 기록 (효율성)
    if (results.success > 0 || results.failed > 0) {
      await supabaseAdmin!
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'BULK_INVITE',
          entity_type: 'batch',
          entity_id: null,
          details: {
            total: users.length,
            success: results.success,
            failed: results.failed,
            success_emails: users.slice(0, results.success).map(u => u.email).slice(0, 10), // 처음 10개만
            error_count: results.errors.length
          }
        })
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `${results.success}명 초대 완료, ${results.failed}명 실패`
    })

  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in bulk-invite API:', error)
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// HTML 이스케이프 함수 (XSS 방지)
function escapeHtml(text: string): string {
  if (!text) return ''
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return String(text).replace(/[&<>"']/g, m => map[m])
}

function generateInviteEmailHTML(name: string, email: string, inviteUrl: string, phone: string, organizationName: string): string {
  const safeName = escapeHtml(name)
  const safePhone = escapeHtml(phone)
  const safeOrgName = escapeHtml(organizationName)
  
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
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요, <strong>${safeName}</strong>님!</p>
    
    ${safeOrgName ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>${safeOrgName}</strong>에서 가입 초대를 보내드립니다.</p>` : ''}
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      아래 링크를 클릭하여 가입을 완료해주세요.
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; font-weight: bold;">🔐 가입 정보</p>
      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">이메일 주소:</p>
        <p style="margin: 0; font-size: 15px; color: #333; font-weight: bold; word-break: break-all;">${email}</p>
      </div>
      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">임시 비밀번호:</p>
        <p style="margin: 0; font-size: 15px; color: #333; font-weight: bold;">${safePhone}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">※ 등록하신 전화번호입니다 (하이픈 없이 숫자만 입력해주세요)</p>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          💡 보안을 위해 가입 후 비밀번호를 변경하는 것을 권장합니다.
        </p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        가입하러 가기 →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
      <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
    </p>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 30px;">
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #856404; font-weight: bold;">
        ⚠️ 중요 안내사항
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #856404; line-height: 1.8;">
        <li>이 초대 링크는 <strong>7일 후 만료</strong>됩니다.</li>
        <li>만료된 링크는 사용할 수 없으며, 운영팀에 새로운 초대를 요청해주시기 바랍니다.</li>
        <li>이미 가입이 완료된 경우 로그인 페이지에서 로그인하실 수 있습니다.</li>
        <li>가입 과정에서 문제가 발생하시면 운영팀에 문의해주시기 바랍니다.</li>
      </ul>
    </div>
    
    <p style="font-size: 11px; color: #999; margin-top: 20px; text-align: center;">
      이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
    </p>
  </div>
</body>
</html>
  `
}

