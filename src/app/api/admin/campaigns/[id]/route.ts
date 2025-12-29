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
      logger.error('Admin log error:', logError)
    }

    return NextResponse.json({
      success: true,
      message: '캠페인 상태가 업데이트되었습니다.'
    })
  } catch (error: any) {
    logger.error('Admin campaign update error:', error)
    const errorMessage = error.message || '캠페인 상태 업데이트 중 오류가 발생했습니다.'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

