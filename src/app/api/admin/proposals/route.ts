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
    console.error('Admin proposal delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

