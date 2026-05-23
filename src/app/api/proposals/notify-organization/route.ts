import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

interface OrganizationProfileWithUser {
  organization_name?: string | null
  users?: { email?: string | null } | { email?: string | null }[] | null
}

const pickFirst = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposalId, campaignId, expertId } = body

    if (!proposalId || !campaignId || !expertId) {
      return NextResponse.json(
        { error: 'Missing required fields: proposalId, campaignId, expertId' },
        { status: 400 }
      )
    }

    const adminClient = getAdminClient()

    // 캠페인 및 기관 정보 조회
    const { data: campaignData, error: campaignError } = await adminClient
      .from('campaigns')
      .select(`
        id,
        title,
        organization_profiles!inner(
          id,
          organization_name,
          user_id,
          users!inner(email)
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaignData) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // 전문가 정보 조회
    const { data: expertData, error: expertError } = await adminClient
      .from('expert_profiles')
      .select(`
        id,
        name,
        users!inner(email)
      `)
      .eq('id', expertId)
      .single()

    if (expertError || !expertData) {
      return NextResponse.json(
        { error: 'Expert not found' },
        { status: 404 }
      )
    }

    const organizationProfile = pickFirst(
      campaignData.organization_profiles as OrganizationProfileWithUser | OrganizationProfileWithUser[] | null
    )
    const organizationUser = pickFirst(organizationProfile?.users)
    const organizationEmail = organizationUser?.email
    const organizationName = organizationProfile?.organization_name || '기관'
    const expertName = expertData.name || '전문가'
    const campaignTitle = campaignData.title

    if (!organizationEmail) {
      console.warn('Organization email not found. Proposal email notification skipped.', { campaignId, proposalId })
      return NextResponse.json({
        success: true,
        message: 'Proposal created but email notification skipped (organization email not found)'
      })
    }

    // 이메일 발송
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not set. Email notification skipped.')
      return NextResponse.json({
        success: true,
        message: 'Proposal created but email notification skipped (RESEND_API_KEY not configured)'
      })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const proposalUrl = `${appUrl}/dashboard/campaigns/${campaignId}/proposals/${proposalId}`

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새로운 제안서가 도착했습니다</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">새로운 제안서가 도착했습니다! 🎉</h1>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; margin-bottom: 20px; color: #333;">
        안녕하세요, ${organizationName}님!
      </p>
      
      <p style="font-size: 16px; margin-bottom: 30px; color: #666;">
        "${campaignTitle}" 캠페인에 <strong>${expertName}</strong> 전문가님이 제안서를 제출하셨습니다.
      </p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${proposalUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
          제안서 확인하기 →
        </a>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; font-weight: bold;">제안서 정보:</p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">캠페인: <strong>${campaignTitle}</strong></p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">전문가: <strong>${expertName}</strong></p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #999; margin: 0 0 10px 0;">
          링크가 작동하지 않으시나요? 아래 주소를 복사하여 브라우저에 붙여넣으세요:
        </p>
        <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 0;">
          ${proposalUrl}
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

    const emailResult = await resend.emails.send({
      // Resend 기본 도메인 사용 (도메인 검증 필요 시 RESEND_FROM_EMAIL 환경 변수 설정)
      from: process.env.RESEND_FROM_EMAIL || 'StartupMatching <onboarding@resend.dev>',
      to: organizationEmail,
      subject: `[${process.env.NEXT_PUBLIC_APP_NAME || 'StartupMatching'}] 새로운 제안서가 도착했습니다 - ${campaignTitle}`,
      html: emailHtml,
    })

    if (!emailResult.data) {
      console.error('Failed to send proposal notification email:', emailResult.error)
      return NextResponse.json({
        success: true,
        message: 'Proposal created but email notification failed',
        error: emailResult.error ? JSON.stringify(emailResult.error) : 'Unknown error'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Proposal notification email sent successfully',
      emailId: emailResult.data.id
    })
  } catch (error: any) {
    console.error('Error sending proposal notification:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
