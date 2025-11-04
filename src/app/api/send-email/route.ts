import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend with API key
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email sending will be disabled.')
    return null
  }
  return new Resend(apiKey)
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

    // Verify the request is authorized (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const internalSecret = process.env.INTERNAL_API_SECRET

    if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Send email via Resend
    const data = await resend.emails.send({
      from: from || 'StartupMatching <noreply@startupmatching.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    return NextResponse.json({
      success: true,
      messageId: data.id,
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
