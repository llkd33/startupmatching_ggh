import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json()

    // Simple security check - in production use proper authentication
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const adminEmail = 'admin@startupmatching.com'

    console.log('🔍 Checking for admin user:', adminEmail)

    // Get auth user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json(
        { error: 'Failed to list users', details: listError.message },
        { status: 500 }
      )
    }

    const authUser = users.find(u => u.email === adminEmail)

    if (!authUser) {
      return NextResponse.json(
        { error: 'Admin user not found in auth.users' },
        { status: 404 }
      )
    }

    console.log('✅ Admin user found in auth.users:', authUser.id)

    // Check if user exists in public.users
    const { data: publicUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (selectError) {
      return NextResponse.json(
        { error: 'Failed to check public.users', details: selectError.message },
        { status: 500 }
      )
    }

    let result

    if (!publicUser) {
      console.log('📝 Creating admin user in public.users...')

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: adminEmail,
          role: 'admin',
          is_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create admin user', details: error.message },
          { status: 500 }
        )
      }

      result = data
      console.log('✅ Admin user created:', data)
    } else {
      console.log('📝 Updating admin user in public.users...')

      const { data, error } = await supabase
        .from('users')
        .update({
          role: 'admin',
          is_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update admin user', details: error.message },
          { status: 500 }
        )
      }

      result = data
      console.log('✅ Admin user updated:', data)
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user setup completed',
      user: result
    })

  } catch (error: any) {
    console.error('Exception during admin setup:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
