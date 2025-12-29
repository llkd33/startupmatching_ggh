import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

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

// GET: 제안서 목록 조회 (페이지네이션 및 최적화)
export async function GET(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const adminClient = getAdminClient()

  try {
    // 필요한 컬럼만 선택하여 성능 최적화
    let query = adminClient
      .from('proposals')
      .select(`
        id,
        cover_letter,
        proposed_budget,
        proposed_timeline,
        status,
        created_at,
        campaigns!inner(
          id,
          title,
          type,
          organization_profiles!inner(
            organization_name
          )
        ),
        expert_profiles!inner(
          name,
          hourly_rate
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // 검색 (인덱스 활용)
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`
      query = query.or(
        `campaigns.title.ilike.${searchTerm},expert_profiles.name.ilike.${searchTerm},campaigns.organization_profiles.organization_name.ilike.${searchTerm}`
      )
    }

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // 데이터 변환
    const proposals = (data || []).map((proposal: any) => ({
      id: proposal.id,
      cover_letter: proposal.cover_letter,
      proposed_budget: proposal.proposed_budget,
      proposed_timeline: proposal.proposed_timeline,
      status: proposal.status,
      created_at: proposal.created_at,
      campaigns: {
        title: proposal.campaigns?.title || '',
        type: proposal.campaigns?.type || '',
        organization_profiles: {
          organization_name: proposal.campaigns?.organization_profiles?.organization_name || ''
        }
      },
      expert_profiles: {
        name: proposal.expert_profiles?.name || '',
        hourly_rate: proposal.expert_profiles?.hourly_rate || null
      }
    }))

    return NextResponse.json({
      proposals,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30'
      }
    })
  } catch (error: any) {
    logger.error('Admin proposals GET error:', error)
    const errorMessage = error.message || '제안서 목록을 불러오는 중 오류가 발생했습니다.'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// DELETE: 제안서 삭제
export async function DELETE(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const proposalId = searchParams.get('id')

  if (!proposalId) {
    return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  try {
    // 제안서 소프트 삭제 (status를 withdrawn으로 변경)
    const { error: deleteError } = await adminClient
      .from('proposals')
      .update({
        status: 'withdrawn',
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)

    if (deleteError) {
      throw new Error(`제안서 삭제 실패: ${deleteError.message}`)
    }

    // 로그 기록 (실패해도 계속 진행)
    try {
      await adminClient
        .from('admin_logs')
        .insert({
          admin_user_id: authResult.user.id,
          action: 'DELETE_PROPOSAL',
          entity_type: 'proposal',
          entity_id: proposalId,
          details: {
            timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.error('Admin log error:', logError)
    }

    return NextResponse.json({
      success: true,
      message: '제안서가 삭제되었습니다.'
    })
  } catch (error: any) {
    logger.error('Admin proposal delete error:', error)
    const errorMessage = error.message || '제안서 삭제 중 오류가 발생했습니다.'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
