import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
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
        expert_profiles!inner(name),
        organization_profiles!inner(name)
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

    // Update request status to rejected
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        status: 'rejected',
        expert_responded_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      throw updateError
    }

    // Return success page
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>연결 요청 거절 완료</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 500px;
          }
          .info-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #4B5563;
            margin-bottom: 20px;
          }
          p {
            color: #6B7280;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background: #6B7280;
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
          <div class="info-icon">ℹ️</div>
          <h1>연결 요청을 거절했습니다</h1>
          <p>${connectionRequest.organization_profiles.name}에 거절 의사가 전달되었습니다.</p>
          <p>향후 더 적합한 기회가 있을 것입니다.</p>
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
    console.error('Connection request rejection error:', error)
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 })
  }
}