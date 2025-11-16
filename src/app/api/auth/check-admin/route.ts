import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', user_id)
      .maybeSingle()

    if (userError) {
      console.error('Error checking admin status:', userError)
      return NextResponse.json(
        { error: userError.message, code: userError.code },
        { status: 400 }
      )
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found', isAdmin: false },
        { status: 404 }
      )
    }

    const isAdmin = userData.is_admin === true || userData.role === 'admin'

    return NextResponse.json({
      isAdmin,
      userData: {
        is_admin: userData.is_admin,
        role: userData.role
      }
    })
  } catch (error) {
    console.error('Exception checking admin status:', error)
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    )
  }
}

