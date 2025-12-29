import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

// Service role 키로 Supabase 클라이언트 생성
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// GET: 통합 통계 조회 (한 번의 RPC 호출로 모든 통계 반환)
export async function GET(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = getAdminClient()

  try {
    // 병렬 처리하되 에러 시 개별 fallback
    const [
      userCountResult,
      expertCountResult,
      organizationCountResult,
      campaignCountResult,
      proposalCountResult,
      activeCampaignCountResult,
      acceptedProposalCountResult,
      recentCampaignsResult,
      recentProposalsResult
    ] = await Promise.allSettled([
      adminClient.from('users').select('id', { count: 'exact', head: true }),
      adminClient.from('users').select('id', { count: 'exact', head: true }).eq('role', 'expert'),
      adminClient.from('users').select('id', { count: 'exact', head: true }).eq('role', 'organization'),
      adminClient.from('campaigns').select('id', { count: 'exact', head: true }),
      adminClient.from('proposals').select('id', { count: 'exact', head: true }),
      adminClient.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      adminClient.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
      adminClient.from('campaigns')
        .select('*, organization_profiles(organization_name)')
        .order('created_at', { ascending: false })
        .limit(5),
      adminClient.from('proposals')
        .select('*, campaigns(title), expert_profiles(name)')
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // 안전하게 결과 추출
    const safeExtract = (result: any, defaultValue: any = 0) => {
      if (result.status === 'fulfilled') {
        return result.value?.count ?? result.value?.data ?? defaultValue
      }
      logger.error('Stats fetch error:', result.reason)
      return defaultValue
    }

    const stats = {
      userCount: safeExtract(userCountResult),
      expertCount: safeExtract(expertCountResult),
      organizationCount: safeExtract(organizationCountResult),
      campaignCount: safeExtract(campaignCountResult),
      proposalCount: safeExtract(proposalCountResult),
      activeCampaignCount: safeExtract(activeCampaignCountResult),
      acceptedProposalCount: safeExtract(acceptedProposalCountResult),
      recentCampaigns: safeExtract(recentCampaignsResult, []),
      recentProposals: safeExtract(recentProposalsResult, [])
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    logger.error('Admin stats error:', error)
    // 에러가 있어도 기본값 반환
    return NextResponse.json({
      userCount: 0,
      expertCount: 0,
      organizationCount: 0,
      campaignCount: 0,
      proposalCount: 0,
      activeCampaignCount: 0,
      acceptedProposalCount: 0,
      recentCampaigns: [],
      recentProposals: [],
      error: 'Failed to fetch some statistics'
    }, { status: 200 })
  }
}
