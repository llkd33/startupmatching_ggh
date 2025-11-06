import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // Check which profiles the user has
    const [expertProfileResult, orgProfileResult] = await Promise.all([
      supabase
        .from('expert_profiles')
        .select('id, name, is_profile_complete')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('organization_profiles')
        .select('id, organization_name, is_profile_complete')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const availableRoles: Array<{
      role: 'expert' | 'organization'
      name: string
      hasProfile: boolean
      isProfileComplete: boolean
    }> = []

    if (expertProfileResult.data) {
      availableRoles.push({
        role: 'expert',
        name: expertProfileResult.data.name || '전문가',
        hasProfile: true,
        isProfileComplete: expertProfileResult.data.is_profile_complete ?? false,
      })
    }

    if (orgProfileResult.data) {
      availableRoles.push({
        role: 'organization',
        name: orgProfileResult.data.organization_name || '기관',
        hasProfile: true,
        isProfileComplete: orgProfileResult.data.is_profile_complete ?? false,
      })
    }

    // Also check users table role as fallback
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // If user has a role in users table but no profile, add it as available
    if (userData?.role) {
      const roleExists = availableRoles.some((r) => r.role === userData.role)
      if (!roleExists) {
        if (userData.role === 'expert') {
          availableRoles.push({
            role: 'expert',
            name: '전문가',
            hasProfile: false,
            isProfileComplete: false,
          })
        } else if (userData.role === 'organization') {
          availableRoles.push({
            role: 'organization',
            name: '기관',
            hasProfile: false,
            isProfileComplete: false,
          })
        }
      }
    }

    return NextResponse.json({
      availableRoles,
      hasMultipleRoles: availableRoles.length > 1,
    })
  } catch (error) {
    console.error('Error checking user profiles:', error)
    return NextResponse.json(
      { error: '프로필을 확인하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

