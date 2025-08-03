import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/email-service'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Verify authentication (you should add proper auth check here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let result
    
    switch (type) {
      case 'campaign_match':
        // Send campaign match notifications to selected experts
        const { campaignId, expertIds } = data
        
        // Get campaign details
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('title')
          .eq('id', campaignId)
          .single()
        
        if (!campaign) {
          return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
        }
        
        // Get expert emails
        const { data: experts } = await supabase
          .from('expert_profiles')
          .select('id, name, users!inner(email)')
          .in('id', expertIds)
        
        if (!experts || experts.length === 0) {
          return NextResponse.json({ error: 'No experts found' }, { status: 404 })
        }
        
        // Send emails in batches
        const emailPromises = experts.map(expert => 
          emailService.sendCampaignMatchNotification(
            expert.users.email,
            expert.name || 'Expert',
            campaign.title,
            campaignId
          )
        )
        
        // Create notifications in database
        const notifications = experts.map(expert => ({
          user_id: expert.users.id,
          type: 'campaign_match',
          title: '새로운 매칭 요청',
          content: `"${campaign.title}" 캠페인에 매칭되었습니다.`,
          data: { campaign_id: campaignId },
        }))
        
        await supabase.from('notifications').insert(notifications)
        
        // Send emails with rate limiting for Gmail
        result = await Promise.all(emailPromises)
        
        // Update campaign_matches table
        const matches = expertIds.map(expertId => ({
          campaign_id: campaignId,
          expert_id: expertId,
          match_score: 0.8, // You can calculate this based on actual matching
          match_stage: 1,
          notified_at: new Date().toISOString(),
        }))
        
        await supabase.from('campaign_matches').upsert(matches)
        
        break
      
      case 'proposal_received':
        const { proposalId } = data
        
        // Get proposal details with campaign and organization info
        const { data: proposal } = await supabase
          .from('proposals')
          .select(`
            id,
            expert_profiles!inner(name),
            campaigns!inner(
              title,
              organization_profiles!inner(
                organization_name,
                users!inner(email)
              )
            )
          `)
          .eq('id', proposalId)
          .single()
        
        if (!proposal) {
          return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
        }
        
        result = await emailService.sendProposalReceivedNotification(
          proposal.campaigns.organization_profiles.users.email,
          proposal.campaigns.organization_profiles.organization_name,
          proposal.expert_profiles.name,
          proposal.campaigns.title,
          proposalId
        )
        
        // Create notification in database
        await supabase.from('notifications').insert({
          user_id: proposal.campaigns.organization_profiles.users.id,
          type: 'proposal_received',
          title: '새로운 제안서',
          content: `${proposal.expert_profiles.name}님이 제안서를 제출했습니다.`,
          data: { proposal_id: proposalId },
        })
        
        break
      
      case 'welcome':
        const { email, name, role } = data
        
        result = await emailService.sendWelcomeEmail(email, name, role)
        break
      
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}