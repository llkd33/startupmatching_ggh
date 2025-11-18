import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role 키로 Supabase 클라이언트 생성 (RLS 우회 가능)
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

// GET: 사용자 목록 조회 (페이지네이션)
export async function GET(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const role = searchParams.get('role')
  const search = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const adminClient = getAdminClient()

  try {
    // 필요한 컬럼만 선택하여 성능 최적화
    const selectColumns = 'id, email, name, role, is_admin, organization_name, is_verified, created_at, updated_at'
    
    let query = adminClient
      .from('user_profiles')
      .select(selectColumns, { count: 'exact' })

    // 필터 적용
    if (role && role !== 'all') {
      if (role === 'admin') {
        query = query.eq('is_admin', true)
      } else {
        query = query.eq('role', role)
      }
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,organization_name.ilike.%${search}%`)
    }

    // 정렬 (인덱스가 있는 컬럼 우선 사용)
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      users: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 사용자 작업 (관리자 권한 부여/해제, 삭제 등)
export async function POST(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, userId } = body

  const adminClient = getAdminClient()

  try {
    switch (action) {
      case 'toggle_admin': {
        const { currentIsAdmin } = body

        // users 테이블 업데이트
        const { error: updateError } = await adminClient
          .from('users')
          .update({ is_admin: !currentIsAdmin })
          .eq('id', userId)

        if (updateError) throw updateError

        // 로그 기록
        await adminClient
          .from('admin_logs')
          .insert({
            admin_user_id: authResult.user.id,
            action: currentIsAdmin ? 'REVOKE_ADMIN' : 'GRANT_ADMIN',
            entity_type: 'user',
            entity_id: userId,
            details: {
              timestamp: new Date().toISOString(),
              previous_value: currentIsAdmin,
              new_value: !currentIsAdmin
            }
          })

        return NextResponse.json({ success: true })
      }

      case 'toggle_verified': {
        const { currentVerified, userRole } = body

        if (userRole === 'organization') {
          const { error } = await adminClient
            .from('organization_profiles')
            .update({ is_verified: !currentVerified })
            .eq('user_id', userId)

          if (error) throw error

          // 로그 기록
          await adminClient
            .from('admin_logs')
            .insert({
              admin_user_id: authResult.user.id,
              action: currentVerified ? 'UNVERIFY_ORGANIZATION' : 'VERIFY_ORGANIZATION',
              entity_type: 'organization',
              entity_id: userId,
              details: {
                timestamp: new Date().toISOString(),
                previous_value: currentVerified,
                new_value: !currentVerified
              }
            })
        }

        return NextResponse.json({ success: true })
      }

      case 'soft_delete': {
        // 관련 데이터 확인
        const { data: campaigns } = await adminClient
          .from('campaigns')
          .select('id')
          .eq('organization_id', userId)
          .limit(1)

        const { data: proposals } = await adminClient
          .from('proposals')
          .select('id')
          .eq('expert_id', userId)
          .limit(1)

        const hasRelatedData = (campaigns && campaigns.length > 0) || (proposals && proposals.length > 0)

        // 사용자 정보 조회 (초대만 된 사용자는 public.users에 없을 수 있음)
        const { data: user, error: userFetchError } = await adminClient
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

        // 초대만 된 사용자(가입 안 한 사용자)인 경우 auth.users에서 직접 삭제
        if (userFetchError || !user) {
          // public.users에 레코드가 없으면 초대만 된 사용자로 간주
          // auth.users에서 직접 삭제 시도
          try {
            // Admin 클라이언트를 사용하여 auth.users에서 삭제
            const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
            
            if (deleteAuthError) {
              throw new Error(`초대된 사용자 삭제 실패: ${deleteAuthError.message}`)
            }

            // 로그 기록
            try {
              await adminClient
                .from('admin_logs')
                .insert({
                  admin_user_id: authResult.user.id,
                  action: 'DELETE_INVITED_USER',
                  entity_type: 'user',
                  entity_id: userId,
                  details: {
                    timestamp: new Date().toISOString(),
                    note: '초대만 된 사용자 (가입 전) 삭제'
                  }
                })
            } catch (logError) {
              console.error('Admin log error:', logError)
            }

            return NextResponse.json({
              success: true,
              hasRelatedData: false,
              message: '초대된 사용자가 삭제되었습니다.'
            })
          } catch (deleteError: any) {
            throw new Error(`사용자 삭제 실패: ${deleteError.message}`)
          }
        }

        // users 테이블에 레코드가 있는 경우 (가입한 사용자)
        // deleted_at 컬럼 존재 여부와 관계없이 안전하게 업데이트
        try {
          // 먼저 is_admin만 업데이트 시도 (가장 안전)
          const { error: adminUpdateError } = await adminClient
            .from('users')
            .update({ is_admin: false })
            .eq('id', userId)

          if (adminUpdateError) {
            throw adminUpdateError
          }

          // deleted_at 컬럼이 있으면 설정 시도 (없어도 에러 무시)
          try {
            await adminClient
              .from('users')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', userId)
          } catch (deletedAtError: any) {
            // deleted_at 컬럼이 없거나 다른 에러인 경우 무시
            if (!deletedAtError.message?.includes('deleted_at') && deletedAtError.code !== '42703') {
              console.warn('deleted_at 업데이트 실패 (무시됨):', deletedAtError.message)
            }
          }
        } catch (updateError: any) {
          throw new Error(`사용자 삭제 실패: ${updateError.message}`)
        }

        // 프로필도 소프트 삭제 (에러가 나도 계속 진행)
        if (user?.role === 'expert') {
          try {
            await adminClient
              .from('expert_profiles')
              .update({ deleted_at: new Date().toISOString() })
              .eq('user_id', userId)
          } catch (profileError) {
            // 프로필 삭제 실패는 로그만 남기고 계속 진행
            console.error('Expert profile deletion error:', profileError)
          }
        } else if (user?.role === 'organization') {
          try {
            await adminClient
              .from('organization_profiles')
              .update({ deleted_at: new Date().toISOString() })
              .eq('user_id', userId)
          } catch (profileError) {
            // 프로필 삭제 실패는 로그만 남기고 계속 진행
            console.error('Organization profile deletion error:', profileError)
          }
        }

        // 로그 기록 (실패해도 계속 진행)
        try {
          await adminClient
            .from('admin_logs')
            .insert({
              admin_user_id: authResult.user.id,
              action: 'SOFT_DELETE_USER',
              entity_type: 'user',
              entity_id: userId,
              details: {
                timestamp: new Date().toISOString(),
                has_related_data: hasRelatedData,
                warning: hasRelatedData ? 'User has related campaigns or proposals' : null
              }
            })
        } catch (logError) {
          // 로그 실패는 무시
          console.error('Admin log error:', logError)
        }

        return NextResponse.json({
          success: true,
          hasRelatedData,
          message: hasRelatedData
            ? '사용자가 삭제되었습니다. 관련 캠페인/제안서는 유지됩니다.'
            : '사용자가 삭제되었습니다.'
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Admin action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
