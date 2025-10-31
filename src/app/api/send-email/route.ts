import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const internalSecret = process.env.INTERNAL_API_SECRET

    if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { to, subject, html, from } = await request.json()

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

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send email',
      },
      { status: 500 }
    )
  }
}
