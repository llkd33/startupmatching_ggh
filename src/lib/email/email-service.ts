import nodemailer from 'nodemailer'
import { EmailTemplate, EmailOptions } from './email-templates'

// Create reusable transporter
const createTransporter = () => {
  // Using Gmail App Password (simpler than OAuth2)
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    })
  }
  
  // Fallback to console logging in development
  if (process.env.NODE_ENV === 'development') {
    return {
      sendMail: async (options: any) => {
        console.log('📧 Email would be sent:', options)
        return { messageId: 'dev-' + Date.now() }
      }
    }
  }
  
  throw new Error('Email configuration not found')
}

export class EmailService {
  private transporter: any
  
  constructor() {
    this.transporter = createTransporter()
  }

  async sendEmail(options: EmailOptions) {
    try {
      const mailOptions = {
        from: `"전문가 매칭 플랫폼" <${process.env.EMAIL_USER || 'noreply@example.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Email sent:', result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { success: false, error: error.message }
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