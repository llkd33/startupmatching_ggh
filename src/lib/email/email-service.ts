import { Resend } from 'resend'
import { EmailTemplate, EmailOptions } from './email-templates'

// Initialize Resend client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email sending will be disabled.')
    return null
  }
  return new Resend(apiKey)
}

export class EmailService {
  private resend: Resend | null
  
  constructor() {
    this.resend = getResendClient()
  }

  async sendEmail(options: EmailOptions) {
    try {
      if (!this.resend) {
        console.warn('Resend is not configured. Email sending skipped.')
        return { success: false, error: 'Email service is not configured' }
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'StartupMatching <noreply@startupmatching.com>'
      
      const result = await this.resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      if (!result.data) {
        console.error('Failed to send email:', result.error)
        return { success: false, error: result.error ? JSON.stringify(result.error) : 'Unknown error' }
      }

      console.log('Email sent:', result.data.id)
      return { success: true, messageId: result.data.id }
    } catch (error: any) {
      console.error('Email sending failed:', error)
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  // Campaign match notification for experts
  async sendCampaignMatchNotification(
    expertEmail: string,
    expertName: string,
    campaignTitle: string,
    campaignId: string
  ) {
    const template = EmailTemplate.campaignMatch({
      expertName,
      campaignTitle,
      campaignUrl: `${process.env.NEXT_PUBLIC_APP_URL}/campaigns/${campaignId}`,
    })

    return this.sendEmail({
      to: expertEmail,
      ...template,
    })
  }

  // Proposal received notification for organizations
  async sendProposalReceivedNotification(
    organizationEmail: string,
    organizationName: string,
    expertName: string,
    campaignTitle: string,
    proposalId: string
  ) {
    const template = EmailTemplate.proposalReceived({
      organizationName,
      expertName,
      campaignTitle,
      proposalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposalId}`,
    })

    return this.sendEmail({
      to: organizationEmail,
      ...template,
    })
  }

  // Proposal status update for experts
  async sendProposalStatusNotification(
    expertEmail: string,
    expertName: string,
    campaignTitle: string,
    status: 'accepted' | 'rejected',
    message?: string
  ) {
    const template = EmailTemplate.proposalStatus({
      expertName,
      campaignTitle,
      status,
      message,
    })

    return this.sendEmail({
      to: expertEmail,
      ...template,
    })
  }

  // Welcome email for new users
  async sendWelcomeEmail(
    email: string,
    name: string,
    role: 'expert' | 'organization'
  ) {
    const template = EmailTemplate.welcome({
      name,
      role,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${role}/dashboard`,
    })

    return this.sendEmail({
      to: email,
      ...template,
    })
  }

  // Password reset email
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ) {
    const template = EmailTemplate.passwordReset({
      name,
      resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`,
    })

    return this.sendEmail({
      to: email,
      ...template,
    })
  }

  // Batch email sending with rate limiting (for Gmail's 100/day limit)
  async sendBatchEmails(
    emails: { to: string; template: any }[],
    delayMs: number = 1000
  ) {
    const results = []
    const batchSize = 10 // Send 10 emails at a time
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      
      const batchResults = await Promise.all(
        batch.map(email => this.sendEmail({
          to: email.to,
          ...email.template,
        }))
      )
      
      results.push(...batchResults)
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    return results
  }
}

// Export singleton instance
export const emailService = new EmailService()