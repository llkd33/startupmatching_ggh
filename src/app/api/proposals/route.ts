import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const getBearerToken = (request: NextRequest) => {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  return authorization.slice('Bearer '.length).trim() || null
}

const normalizePortfolioLinks = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .filter((link): link is string => typeof link === 'string')
    .map((link) => link.trim())
    .filter(Boolean)
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()
    const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const campaignId =
      typeof body.campaign_id === 'string'
        ? body.campaign_id.trim()
        : typeof body.campaignId === 'string'
          ? body.campaignId.trim()
          : ''
    const expertId =
      typeof body.expert_id === 'string'
        ? body.expert_id.trim()
        : typeof body.expertId === 'string'
          ? body.expertId.trim()
          : ''
    const proposalText = typeof body.proposal_text === 'string' ? body.proposal_text.trim() : ''
    const portfolioLinks = normalizePortfolioLinks(body.portfolio_links)

    if (!campaignId || !expertId || !proposalText) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const { data: expertProfile, error: expertError } = await adminClient
      .from('expert_profiles')
      .select('id, user_id')
      .eq('id', expertId)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (expertError) throw expertError

    if (!expertProfile) {
      return NextResponse.json(
        { error: '전문가 프로필을 찾을 수 없습니다.' },
        { status: 403 }
      )
    }

    const { data: campaign, error: campaignError } = await adminClient
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) throw campaignError

    if (!campaign) {
      return NextResponse.json(
        { error: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: '활성화된 캠페인에만 제안서를 제출할 수 있습니다.' },
        { status: 400 }
      )
    }

    const { data: existingProposal, error: existingError } = await adminClient
      .from('proposals')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('expert_id', expertId)
      .maybeSingle()

    if (existingError) throw existingError

    if (existingProposal) {
      return NextResponse.json(
        {
          error: '이미 제출한 제안서가 있습니다.',
          proposalId: existingProposal.id,
        },
        { status: 409 }
      )
    }

    const { data: proposal, error: insertError } = await adminClient
      .from('proposals')
      .insert({
        campaign_id: campaignId,
        expert_id: expertId,
        proposal_text: proposalText,
        cover_letter: proposalText,
        estimated_budget: null,
        estimated_start_date: null,
        estimated_end_date: null,
        portfolio_links: portfolioLinks,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    console.error('Proposal POST error:', error)
    return NextResponse.json(
      { error: '제안서 제출 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
