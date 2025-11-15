import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { notifications } = await request.json()

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json(
        { error: 'Invalid notifications data' },
        { status: 400 }
      )
    }

    // Validate all notifications have required fields
    for (const notification of notifications) {
      if (!notification.user_id || !notification.type || !notification.title || !notification.content) {
        return NextResponse.json(
          { error: 'Missing required fields: user_id, type, title, content' },
          { status: 400 }
        )
      }
    }

    // Map notification data to match database schema
    const notificationRecords = notifications.map(n => ({
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      message: n.content, // Map content to message field
      data: n.data || {},
      action_url: n.action_url,
      action_text: n.action_text,
      is_read: false,
    }))

    // Insert notifications
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationRecords)
      .select()

    if (error) {
      console.error('Error creating notifications:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notifications: data,
    })
  } catch (error: any) {
    console.error('Error in notifications API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

