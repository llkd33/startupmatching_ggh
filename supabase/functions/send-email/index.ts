import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // Get pending emails
    const { data: emails, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('status', 'pending')
      .limit(10)

    if (error) throw error

    // Send each email
    for (const email of emails || []) {
      try {
        // Prepare email content based on type
        let htmlContent = ''
        const metadata = email.metadata || {}

        switch (email.email_type) {
          case 'connection_request':
            htmlContent = `
              <h2>새로운 연결 요청이 있습니다!</h2>
              <p>안녕하세요 ${metadata.expert_name}님,</p>
              <p><strong>${metadata.organization_name}</strong>에서 연결 요청을 보냈습니다.</p>
              <p>캠페인: <strong>${metadata.campaign_title}</strong></p>
              <br>
              <p><a href="https://startupmatching.vercel.app/dashboard/notifications" 
                    style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                           text-decoration: none; border-radius: 6px; display: inline-block;">
                    요청 확인하기
                 </a></p>
            `
            break

          case 'request_approved':
            htmlContent = `
              <h2>연결 요청이 승인되었습니다!</h2>
              <p>안녕하세요 ${metadata.organization_name}님,</p>
              <p><strong>${metadata.expert_name}</strong>님이 연결 요청을 승인했습니다.</p>
              <p>캠페인: <strong>${metadata.campaign_title}</strong></p>
              <br>
              <p><a href="https://startupmatching.vercel.app/dashboard/messages" 
                    style="background-color: #10B981; color: white; padding: 12px 24px; 
                           text-decoration: none; border-radius: 6px; display: inline-block;">
                    메시지 보내기
                 </a></p>
            `
            break

          case 'request_rejected':
            htmlContent = `
              <h2>연결 요청 결과</h2>
              <p>안녕하세요 ${metadata.organization_name}님,</p>
              <p><strong>${metadata.expert_name}</strong>님이 연결 요청을 거절했습니다.</p>
              <p>캠페인: <strong>${metadata.campaign_title}</strong></p>
              <br>
              <p><a href="https://startupmatching.vercel.app/dashboard/experts" 
                    style="background-color: #6B7280; color: white; padding: 12px 24px; 
                           text-decoration: none; border-radius: 6px; display: inline-block;">
                    다른 전문가 찾기
                 </a></p>
            `
            break
        }

        // Send email via Resend
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'StartupMatching <noreply@startupmatching.com>',
            to: [email.recipient_email],
            subject: email.subject,
            html: htmlContent,
          }),
        })

        if (res.ok) {
          // Update email status to sent
          await supabase
            .from('email_logs')
            .update({ status: 'sent' })
            .eq('id', email.id)
        } else {
          const error = await res.text()
          await supabase
            .from('email_logs')
            .update({ 
              status: 'failed',
              error_message: error 
            })
            .eq('id', email.id)
        }
      } catch (err) {
        console.error('Error sending email:', err)
        await supabase
          .from('email_logs')
          .update({ 
            status: 'failed',
            error_message: err.message 
          })
          .eq('id', email.id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: emails?.length || 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})