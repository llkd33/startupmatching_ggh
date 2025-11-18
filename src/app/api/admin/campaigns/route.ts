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

// DELETE: 캠페인 삭제
export async function DELETE(req: NextRequest) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const campaignId = searchParams.get('id')

  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  try {
    // 관련 제안서 확인
    const { data: proposals } = await adminClient
      .from('proposals')
      .select('id')
      .eq('campaign_id', campaignId)
      .limit(1)

    const hasProposals = proposals && proposals.length > 0

    // 캠페인 소프트 삭제 (status를 cancelled로 변경, deleted_at 설정)
    const updateData: any = {
      status: 'cancelled',
      updated_at: new Date().toISOString()
    }

    // deleted_at 컬럼이 있으면 설정
    try {
      const { error: deleteError } = await adminClient
        .from('campaigns')
        .update({
          ...updateData,
          deleted_at: new Date().toISOString()
        })
        .eq('id', campaignId)

      if (deleteError) {
        // deleted_at 컬럼이 없는 경우, status만 업데이트
        if (deleteError.message?.includes('deleted_at') || deleteError.code === '42703') {
          const { error: fallbackError } = await adminClient
            .from('campaigns')
            .update(updateData)
            .eq('id', campaignId)
          
          if (fallbackError) throw fallbackError
        } else {
          throw deleteError
        }
      }
    } catch (updateError: any) {
      throw new Error(`캠페인 삭제 실패: ${updateError.message}`)
    }

    // 로그 기록 (실패해도 계속 진행)
    try {
      await adminClient
        .from('admin_logs')
        .insert({
          admin_user_id: authResult.user.id,
          action: 'DELETE_CAMPAIGN',
          entity_type: 'campaign',
          entity_id: campaignId,
          details: {
            timestamp: new Date().toISOString(),
            has_proposals: hasProposals,
            warning: hasProposals ? 'Campaign has related proposals' : null
          }
        })
    } catch (logError) {
      console.error('Admin log error:', logError)
    }

    return NextResponse.json({
      success: true,
      hasProposals,
      message: hasProposals
        ? '캠페인이 삭제되었습니다. 관련 제안서는 유지됩니다.'
        : '캠페인이 삭제되었습니다.'
    })
  } catch (error: any) {
    console.error('Admin campaign delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

