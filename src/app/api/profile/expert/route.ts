import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/types/supabase'

type ExpertProfileRecord = {
  id: string
  user_id: string
  name?: string | null
  bio?: string | null
  career_history?: unknown[] | null
  education?: unknown[] | null
  skills?: string[] | null
  hashtags?: string[] | null
  portfolio_url?: string | null
  is_profile_complete?: boolean | null
}

type ExpertProfilePayload = {
  name?: unknown
  phone?: unknown
  bio?: unknown
  skills?: unknown
  career?: unknown
  education?: unknown
  portfolio?: unknown
  introduction?: unknown
  complete?: unknown
}

type AdminClient = SupabaseClient<Database>

const ALLOWED_ROLES: readonly UserRole[] = ['expert', 'organization', 'admin']

function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null
  const lower = value.toLowerCase() as UserRole
  return (ALLOWED_ROLES as readonly string[]).includes(lower) ? lower : null
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value)
  return text.length > 0 ? text : null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function getMetadataPhone(user: User): string | null {
  return normalizeNullableText(user.user_metadata?.phone)
}

function getFallbackName(user: User): string {
  return normalizeText(user.user_metadata?.name) || user.email?.split('@')[0] || 'Expert'
}

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

async function getAuthenticatedUser(request: NextRequest, supabase: AdminClient) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    console.error('Failed to verify expert profile token:', error)
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user: data.user, response: null }
}

async function syncUserRecord(
  supabase: AdminClient,
  user: User,
  explicitPhone?: string | null
) {
  if (!user.email) {
    throw new Error('User email is missing')
  }

  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('id, email, role, phone')
    .eq('id', user.id)
    .maybeSingle()

  if (existingUserError) {
    throw existingUserError
  }

  const role = normalizeRole(existingUser?.role) || normalizeRole(user.user_metadata?.role) || 'expert'
  const phone =
    explicitPhone !== undefined
      ? explicitPhone
      : existingUser?.phone || getMetadataPhone(user)

  const { data: syncedUser, error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email,
        role,
        phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, email, role, phone')
    .single()

  if (upsertError) {
    throw upsertError
  }

  return syncedUser
}

async function ensureExpertProfile(supabase: AdminClient, user: User) {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('expert_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingProfileError) {
    throw existingProfileError
  }

  if (existingProfile) {
    return existingProfile as ExpertProfileRecord
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('expert_profiles')
    .insert({
      user_id: user.id,
      name: getFallbackName(user),
      is_profile_complete: false,
    } as any)
    .select('*')
    .single()

  if (createError) {
    throw createError
  }

  return createdProfile as ExpertProfileRecord
}

async function getProfileContext(request: NextRequest) {
  const supabase = createAdminClient()
  const { user, response } = await getAuthenticatedUser(request, supabase)

  if (!user) {
    return { response }
  }

  const syncedUser = await syncUserRecord(supabase, user)
  if (syncedUser.role !== 'expert' && syncedUser.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'Expert account required' }, { status: 403 }),
    }
  }

  const profile = await ensureExpertProfile(supabase, user)

  return {
    supabase,
    user,
    syncedUser,
    profile,
    response: null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getProfileContext(request)
    if (context.response) return context.response

    return NextResponse.json({
      user: context.syncedUser,
      profile: context.profile,
      fallbackName: getFallbackName(context.user),
    })
  } catch (error) {
    console.error('Failed to load expert profile:', error)
    return NextResponse.json(
      { error: 'Failed to load expert profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getProfileContext(request)
    if (context.response) return context.response

    let payload: ExpertProfilePayload
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const phone = normalizeNullableText(payload.phone)
    const name = normalizeText(payload.name) || getFallbackName(context.user)
    const quickBio = normalizeText(payload.bio)
    const detailedIntroduction = normalizeText(payload.introduction)
    const bio = detailedIntroduction.length > quickBio.length ? detailedIntroduction : quickBio
    const skills = normalizeStringArray(payload.skills).slice(0, 3)

    const syncedUser = await syncUserRecord(context.supabase, context.user, phone)

    const profileUpdates: Record<string, unknown> = {
      name,
      bio,
      skills,
      hashtags: skills,
      career_history: normalizeJsonArray(payload.career),
      education: normalizeJsonArray(payload.education),
      portfolio_url: normalizeNullableText(payload.portfolio),
    }

    if (payload.complete === true) {
      profileUpdates.is_profile_complete = true
    }

    const { data: updatedProfile, error: updateError } = await context.supabase
      .from('expert_profiles')
      .update(profileUpdates as any)
      .eq('id', context.profile.id)
      .eq('user_id', context.user.id)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      user: syncedUser,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Failed to save expert profile:', error)
    return NextResponse.json(
      { error: 'Failed to save expert profile' },
      { status: 500 }
    )
  }
}
