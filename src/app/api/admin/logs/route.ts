import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// 관리자 권한 확인
async function checkAdminAuth(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || ''
        }
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { authorized: false }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    return { authorized: false }
  }

  return { authorized: true }
}

// GET: 감사 로그 조회 (필터, 페이지네이션, 검색 지원)
export async function GET(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const action = searchParams.get('action') // 특정 액션 필터
  const adminUserId = searchParams.get('adminUserId') // 특정 관리자 필터
  const entityType = searchParams.get('entityType') // 엔티티 타입 필터
  const startDate = searchParams.get('startDate') // 시작 날짜
  const endDate = searchParams.get('endDate') // 종료 날짜
  const search = searchParams.get('search') // 검색어
  const priority = searchParams.get('priority') // 중요도 (high, medium, low)

  const adminClient = getAdminClient()

  try {
    let query = adminClient
      .from('admin_logs')
      .select('*, users:admin_user_id(email, name)', { count: 'exact' })

    // 필터 적용
    if (action) {
      query = query.eq('action', action)
    }

    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`)
    }

    // 중요도 필터 (특정 액션들을 high priority로 분류)
    if (priority === 'high') {
      query = query.in('action', [
        'DELETE_USER',
        'SOFT_DELETE_USER',
        'GRANT_ADMIN',
        'REVOKE_ADMIN',
        'DELETE_CAMPAIGN',
        'VERIFY_ORGANIZATION'
      ])
    }

    // 정렬
    query = query.order('created_at', { ascending: false })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      logs: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Admin logs GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 로그 내보내기 (CSV)
export async function POST(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { filters } = body

  const adminClient = getAdminClient()

  try {
    let query = adminClient
      .from('admin_logs')
      .select('*, users:admin_user_id(email, name)')

    // 필터 적용
    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    // CSV 생성
    const headers = ['날짜', '관리자', '액션', '엔티티 타입', '엔티티 ID', '상세 정보']
    const rows = (data || []).map((log: any) => [
      new Date(log.created_at).toLocaleString('ko-KR'),
      log.users?.email || '시스템',
      log.action,
      log.entity_type || '',
      log.entity_id || '',
      JSON.stringify(log.details || {})
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="admin-logs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error: any) {
    console.error('Admin logs export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
