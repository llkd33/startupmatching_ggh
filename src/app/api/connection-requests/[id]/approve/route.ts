import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateApprovalConfirmationEmail } from '@/lib/email/connection-request-templates'

interface UserContact {
  email?: string | null
  phone?: string | null
}

interface ExpertProfileRow {
  name?: string | null
  users?: UserContact | UserContact[] | null
}

interface OrganizationProfileRow {
  name?: string | null
  users?: { email?: string | null } | { email?: string | null }[] | null
}

const pickFirst = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Initialize Supabase client
    const supabase = createServerSupabaseClient()
    
    const { id: requestId } = await params
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new NextResponse('인증 토큰이 필요합니다.', { status: 400 })
    }

    // Get connection request details
    const { data: connectionRequest, error: requestError } = await supabase
      .from('connection_requests')
      .select(`
        *,
        expert_profiles!inner(
          name,
          users!inner(email, phone)
        ),
        organization_profiles!inner(
          name,
          users!inner(email)
        )
      `)
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (requestError || !connectionRequest) {
      return new NextResponse('유효하지 않은 요청입니다.', { status: 404 })
    }

    // Check if request has expired
    if (new Date(connectionRequest.expires_at) < new Date()) {
      return new NextResponse('만료된 요청입니다.', { status: 410 })
    }

    const expertProfile = pickFirst(
      connectionRequest.expert_profiles as ExpertProfileRow | ExpertProfileRow[] | null
    )
    const organizationProfile = pickFirst(
      connectionRequest.organization_profiles as OrganizationProfileRow | OrganizationProfileRow[] | null
    )
    const expertUser = pickFirst(expertProfile?.users)
    const organizationUser = pickFirst(organizationProfile?.users)

    if (!expertProfile || !expertUser?.email || !organizationProfile) {
      return new NextResponse('요청 정보를 불러올 수 없습니다.', { status: 404 })
    }

    // Update request status to approved
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        status: 'approved',
        expert_responded_at: new Date().toISOString(),
        shared_contact_info: {
          name: expertProfile.name,
          email: expertUser.email,
          phone: expertUser.phone
        }
      })
      .eq('id', requestId)

    if (updateError) {
      throw updateError
    }

    // Send confirmation email to organization
    const emailData = {
      organizationName: organizationProfile.name || '기관',
      expertName: expertProfile.name || '전문가',
      expertEmail: expertUser.email,
      expertPhone: expertUser.phone || undefined,
      subject: connectionRequest.subject
    }

    const emailContent = generateApprovalConfirmationEmail(emailData)

    // In a real implementation, you would send the email here
    // For now, we'll just log it
    console.log('Approval confirmation email would be sent:', {
      to: organizationUser?.email,
      ...emailContent
    })

    // Return success page
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>연결 요청 승인 완료</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 500px;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #059669;
            margin-bottom: 20px;
          }
          p {
            color: #6B7280;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background: #10B981;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>연결 요청을 승인했습니다!</h1>
          <p>${organizationProfile.name || '기관'}에 연락처 정보가 전달되었습니다.</p>
          <p>곧 연락을 받으실 수 있을 것입니다.</p>
          <p>성공적인 협업이 되시길 바랍니다!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">대시보드로 이동</a>
        </div>
      </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

  } catch (error) {
    console.error('Connection request approval error:', error)
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 })
  }
}
