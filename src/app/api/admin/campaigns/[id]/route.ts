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

// PATCH: 캠페인 상태 업데이트
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await checkAdminAuth(req)
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaignId = params.id
  const body = await req.json()
  const { status } = body

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  try {
    const { error: updateError } = await adminClient
      .from('campaigns')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      throw new Error(`캠페인 상태 업데이트 실패: ${updateError.message}`)
    }

    // 로그 기록
    try {
      await adminClient
        .from('admin_logs')
        .insert({
          admin_user_id: authResult.user.id,
          action: 'UPDATE_CAMPAIGN_STATUS',
          entity_type: 'campaign',
          entity_id: campaignId,
          details: {
            timestamp: new Date().toISOString(),
            new_status: status
          }
        })
    } catch (logError) {
      console.error('Admin log error:', logError)
    }

    return NextResponse.json({
      success: true,
      message: '캠페인 상태가 업데이트되었습니다.'
    })
  } catch (error: any) {
    console.error('Admin campaign update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

