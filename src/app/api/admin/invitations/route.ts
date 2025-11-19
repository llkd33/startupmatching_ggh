import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    return { authorized: false, user: null }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    return { authorized: false, user: null }
  }

  return { authorized: true, user }
}

// GET: 초대 목록 조회 (페이지네이션 및 최적화)
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
      .from('user_invitations')
      .select(`
        id,
        email,
        name,
        phone,
        role,
        organization_name,
        position,
        token,
        status,
        expires_at,
        accepted_at,
        created_at,
        invited_by_user:users!user_invitations_invited_by_fkey(id, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // 검색 (인덱스 활용)
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`
      query = query.or(`email.ilike.${searchTerm},name.ilike.${searchTerm}`)
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
    const invitations = (data || []).map((invitation: any) => ({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      phone: invitation.phone,
      role: invitation.role,
      organization_name: invitation.organization_name,
      position: invitation.position,
      token: invitation.token,
      status: invitation.status,
      expires_at: invitation.expires_at,
      accepted_at: invitation.accepted_at,
      created_at: invitation.created_at,
      invited_by_user: invitation.invited_by_user || null
    }))

    return NextResponse.json({
      invitations,
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
    console.error('Admin invitations GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

