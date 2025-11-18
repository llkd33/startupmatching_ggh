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
    // user_profiles 뷰는 deleted_at을 포함하지 않으므로 users 테이블을 직접 사용
    // 필요한 컬럼만 선택하여 성능 최적화
    let query = adminClient
      .from('users')
      .select(`
        id, 
        email, 
        role, 
        is_admin, 
        created_at, 
        updated_at,
        expert_profiles(name, is_available),
        organization_profiles(organization_name, is_verified)
      `, { count: 'exact' })

    // 삭제된 사용자는 auth.users에서 삭제되므로 자동으로 제외됨
    // users 테이블에 있는 사용자만 조회 (CASCADE로 삭제된 사용자는 자동 제외)

    // 필터 적용
    if (role && role !== 'all') {
      if (role === 'admin') {
        query = query.eq('is_admin', true)
      } else {
        query = query.eq('role', role)
      }
    }

    if (search) {
      // 검색은 email, expert_profiles.name, organization_profiles.organization_name에서 수행
      query = query.or(`email.ilike.%${search}%,expert_profiles.name.ilike.%${search}%,organization_profiles.organization_name.ilike.%${search}%`)
    }

    // 정렬 (인덱스가 있는 컬럼 우선 사용)
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // 데이터 변환 (expert_profiles와 organization_profiles 배열을 평탄화)
    const users = (data || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.expert_profiles?.[0]?.name || user.organization_profiles?.[0]?.organization_name || null,
      role: user.role,
      is_admin: user.is_admin,
      organization_name: user.organization_profiles?.[0]?.organization_name || null,
      is_verified: user.organization_profiles?.[0]?.is_verified || null,
      created_at: user.created_at,
      updated_at: user.updated_at
    }))

    return NextResponse.json({
      users,
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

      case 'update_email': {
        const { newEmail } = body

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
        }

        // 이메일 중복 확인
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('email', newEmail.toLowerCase())
          .neq('id', userId)
          .maybeSingle()

        if (existingUser) {
          return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 })
        }

        // auth.users에서 이메일 업데이트
        const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
        if (!authUser?.user) {
          return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
        }

        // auth.users 이메일 업데이트
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
          email: newEmail.toLowerCase()
        })

        if (authUpdateError) {
          throw new Error(`이메일 업데이트 실패: ${authUpdateError.message}`)
        }

        // public.users 이메일 업데이트
        const { error: userUpdateError } = await adminClient
          .from('users')
          .update({ email: newEmail.toLowerCase(), updated_at: new Date().toISOString() })
          .eq('id', userId)

        if (userUpdateError) {
          throw new Error(`사용자 이메일 업데이트 실패: ${userUpdateError.message}`)
        }

        // 로그 기록
        try {
          await adminClient
            .from('admin_logs')
            .insert({
              admin_user_id: authResult.user.id,
              action: 'UPDATE_USER_EMAIL',
              entity_type: 'user',
              entity_id: userId,
              details: {
                timestamp: new Date().toISOString(),
                previous_email: authUser.user.email,
                new_email: newEmail.toLowerCase()
              }
            })
        } catch (logError) {
          console.error('Admin log error:', logError)
        }

        return NextResponse.json({ 
          success: true,
          message: '이메일이 업데이트되었습니다.'
        })
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
        // auth.users에서 직접 삭제하여 목록에서 제거
        try {
          // auth.users에서 사용자 삭제
          const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
          
          if (deleteAuthError) {
            throw new Error(`사용자 삭제 실패: ${deleteAuthError.message}`)
          }

          // public.users의 레코드는 CASCADE로 자동 삭제되지만, 
          // 명시적으로 삭제하지 않고 auth.users 삭제만으로 충분
        } catch (deleteError: any) {
          throw new Error(`사용자 삭제 실패: ${deleteError.message}`)
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
