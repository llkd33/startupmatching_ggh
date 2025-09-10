import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This API endpoint can be called by a cron job to send task reminders
// Set up a cron job service like Vercel Cron, Railway, or GitHub Actions to call this endpoint

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role key for admin operations

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you should add your own auth check here)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // Get all pending reminders that should be sent
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('task_reminders')
      .select(`
        *,
        task:tasks(
          *,
          assignee:users!tasks_assignee_id_fkey(email, id)
        ),
        user:users(email, id)
      `)
      .eq('is_sent', false)
      .lte('remind_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return NextResponse.json({ message: 'No reminders to send' })
    }

    // Process each reminder
    const results = []
    for (const reminder of pendingReminders) {
      try {
        // Send email notification
        await sendEmailNotification(reminder)
        
        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('task_reminders')
          .update({
            is_sent: true,
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id)

        if (updateError) {
          console.error(`Error updating reminder ${reminder.id}:`, updateError)
          results.push({ id: reminder.id, status: 'error', error: updateError.message })
        } else {
          results.push({ id: reminder.id, status: 'sent' })
        }
      } catch (error: any) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        results.push({ id: reminder.id, status: 'error', error: error.message })
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} reminders`,
      results
    })
  } catch (error: any) {
    console.error('Error in send-reminders:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function sendEmailNotification(reminder: any) {
  // This is where you would integrate with your email service
  // For example, using SendGrid, Resend, or AWS SES
  
  const emailData = {
    to: reminder.user.email,
    subject: `Task Reminder: ${reminder.task.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Task Reminder</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a73e8; margin-top: 0;">${reminder.task.title}</h3>
          
          ${reminder.task.description ? `
            <p style="color: #666; margin: 10px 0;">${reminder.task.description}</p>
          ` : ''}
          
          <table style="margin-top: 15px;">
            <tr>
              <td style="padding-right: 15px; color: #666;">Status:</td>
              <td style="font-weight: bold; color: #333;">${reminder.task.status.replace('_', ' ').toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding-right: 15px; color: #666;">Priority:</td>
              <td style="font-weight: bold; color: #333;">${reminder.task.priority.toUpperCase()}</td>
            </tr>
            ${reminder.task.due_date ? `
              <tr>
                <td style="padding-right: 15px; color: #666;">Due Date:</td>
                <td style="font-weight: bold; color: ${new Date(reminder.task.due_date) < new Date() ? '#d32f2f' : '#333'};">
                  ${new Date(reminder.task.due_date).toLocaleString()}
                </td>
              </tr>
            ` : ''}
            ${reminder.task.assignee ? `
              <tr>
                <td style="padding-right: 15px; color: #666;">Assigned to:</td>
                <td style="font-weight: bold; color: #333;">${reminder.task.assignee.email}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${reminder.task.id}" 
             style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 4px;">
            View Task
          </a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          You received this email because you set a reminder for this task.
          To manage your notifications, visit your settings page.
        </p>
      </div>
    `
  }

  // Example using fetch to send via an email API
  // Replace with your actual email service integration
  
  if (process.env.EMAIL_API_ENDPOINT) {
    const response = await fetch(process.env.EMAIL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`)
    }
  } else {
    // Log email data if no email service is configured
    console.log('Email notification (not sent - no email service configured):', emailData)
  }
}