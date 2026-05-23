import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// 익명 호출 시 허용되는 수신자 목록. 내부 운영 주소만 추가하세요.
// 이 화이트리스트에 없는 주소로는 INTERNAL_API_SECRET 인증된 호출에서만 보낼 수 있습니다.
const PUBLIC_ALLOWED_RECIPIENTS = new Set([
  'support@startupmatch.kr'
])

// Initialize Resend with API key
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email sending will be disabled.')
    return null
  }
  return new Resend(apiKey)
}

const normalizeRecipients = (to: unknown): string[] | null => {
  if (typeof to === 'string') return [to.toLowerCase().trim()]
  if (Array.isArray(to) && to.every((v) => typeof v === 'string')) {
    return to.map((v) => v.toLowerCase().trim())
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Check if Resend is configured
    const resend = getResendClient()
    if (!resend) {
      console.warn('Email sending skipped: RESEND_API_KEY not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'Email service is not configured. Please set RESEND_API_KEY environment variable.',
          skipped: true,
        },
        { status: 503 }
      )
    }

    // 내부 시크릿이 일치하면 임의 수신자로 발송 가능, 그렇지 않으면 공개 허용 수신자만 가능
    const authHeader = request.headers.get('authorization')
    const internalSecret = process.env.INTERNAL_API_SECRET
    const isInternalCall = Boolean(
      internalSecret && authHeader === `Bearer ${internalSecret}`
    )

    // Parse request body
    const body = await request.json()
    const { to, subject, html, from } = body

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    // Open mail relay 방지: 인증되지 않은 호출은 허용된 수신자에게만 발송
    const recipients = normalizeRecipients(to)
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 })
    }

    if (!isInternalCall) {
      const allDisallowed = recipients.some(
        (recipient) => !PUBLIC_ALLOWED_RECIPIENTS.has(recipient)
      )
      if (allDisallowed) {
        return NextResponse.json(
          { error: 'Recipient not allowed for unauthenticated calls' },
          { status: 403 }
        )
      }
    }

    // Send email via Resend
    // Resend 기본 도메인 사용 (도메인 검증 필요 시 RESEND_FROM_EMAIL 환경 변수 설정)
    const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'StartupMatching <onboarding@resend.dev>'
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    if (!result.data) {
      console.error('Resend API Error:', JSON.stringify(result.error, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: result.error ? JSON.stringify(result.error) : 'Failed to send email',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.data.id,
    })
  } catch (error: any) {
    console.error('Error sending email:', error)

    // More specific error messages
    let errorMessage = 'Failed to send email'
    let statusCode = 500

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid email service API key'
      statusCode = 401
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Email rate limit exceeded'
      statusCode = 429
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    )
  }
}
