import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/types/supabase'

type OrganizationProfileRecord = {
  id: string
  user_id: string
  organization_name?: string | null
  business_number?: string | null
  representative_name?: string | null
  contact_position?: string | null
  industry?: string | null
  employee_count?: string | null
  website?: string | null
  description?: string | null
  is_profile_complete?: boolean | null
}

type OrganizationProfilePayload = {
  organizationName?: unknown
  businessNumber?: unknown
  representativeName?: unknown
  contactPosition?: unknown
  industry?: unknown
  employeeCount?: unknown
  website?: unknown
  description?: unknown
  complete?: unknown
}

type AdminClient = SupabaseClient<Database>
type OrganizationProfileUpdate = Database['public']['Tables']['organization_profiles']['Update']

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
    console.error('Failed to verify organization profile token:', error)
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user: data.user, response: null }
}

function getMetadataDefaults(user: User) {
  const organizationName =
    normalizeText(user.user_metadata?.organizationName) ||
    normalizeText(user.user_metadata?.organization_name) ||
    user.email?.split('@')[0] ||
    ''

  return {
    organizationName,
    businessNumber:
      normalizeNullableText(user.user_metadata?.businessNumber) ||
      normalizeNullableText(user.user_metadata?.business_number),
    representativeName:
      normalizeText(user.user_metadata?.representativeName) ||
      normalizeText(user.user_metadata?.representative_name),
    contactPosition:
      normalizeNullableText(user.user_metadata?.contactPosition) ||
      normalizeNullableText(user.user_metadata?.contact_position),
    phone: normalizeNullableText(user.user_metadata?.phone),
  }
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

  const role = normalizeRole(existingUser?.role) || normalizeRole(user.user_metadata?.role) || 'organization'
  const metadataDefaults = getMetadataDefaults(user)
  const phone =
    explicitPhone !== undefined
      ? explicitPhone
      : existingUser?.phone || metadataDefaults.phone

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

function mergeMissingSignupFields(
  profile: OrganizationProfileRecord,
  user: User
): OrganizationProfileRecord {
  const defaults = getMetadataDefaults(user)

  return {
    ...profile,
    organization_name: profile.organization_name || defaults.organizationName,
    business_number: profile.business_number || defaults.businessNumber,
    representative_name: profile.representative_name || defaults.representativeName,
    contact_position: profile.contact_position || defaults.contactPosition,
  }
}

async function ensureOrganizationProfile(supabase: AdminClient, user: User) {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('organization_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingProfileError) {
    throw existingProfileError
  }

  if (existingProfile) {
    return mergeMissingSignupFields(existingProfile as OrganizationProfileRecord, user)
  }

  const defaults = getMetadataDefaults(user)
  const { data: createdProfile, error: createError } = await supabase
    .from('organization_profiles')
    .insert({
      user_id: user.id,
      organization_name: defaults.organizationName,
      business_number: defaults.businessNumber,
      representative_name: defaults.representativeName,
      contact_position: defaults.contactPosition,
      is_profile_complete: false,
    })
    .select('*')
    .single()

  if (createError) {
    throw createError
  }

  return createdProfile as OrganizationProfileRecord
}

async function getProfileContext(request: NextRequest) {
  const supabase = createAdminClient()
  const { user, response } = await getAuthenticatedUser(request, supabase)

  if (!user) {
    return { response }
  }

  const syncedUser = await syncUserRecord(supabase, user)
  if (syncedUser.role !== 'organization' && syncedUser.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'Organization account required' }, { status: 403 }),
    }
  }

  const profile = await ensureOrganizationProfile(supabase, user)

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
    })
  } catch (error) {
    console.error('Failed to load organization profile:', error)
    return NextResponse.json(
      { error: 'Failed to load organization profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getProfileContext(request)
    if (context.response) return context.response

    let payload: OrganizationProfilePayload
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const defaults = getMetadataDefaults(context.user)
    const profileUpdates: OrganizationProfileUpdate = {
      organization_name: normalizeText(payload.organizationName) || defaults.organizationName,
      business_number: normalizeNullableText(payload.businessNumber),
      representative_name: normalizeText(payload.representativeName) || defaults.representativeName,
      contact_position: normalizeNullableText(payload.contactPosition),
      industry: normalizeNullableText(payload.industry),
      employee_count: normalizeNullableText(payload.employeeCount),
      website: normalizeNullableText(payload.website),
      description: normalizeNullableText(payload.description),
      updated_at: new Date().toISOString(),
    }

    if (payload.complete === true) {
      profileUpdates.is_profile_complete = true
    }

    const { data: updatedProfile, error: updateError } = await context.supabase
      .from('organization_profiles')
      .update(profileUpdates)
      .eq('id', context.profile.id)
      .eq('user_id', context.user.id)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      user: context.syncedUser,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Failed to save organization profile:', error)
    return NextResponse.json(
      { error: 'Failed to save organization profile' },
      { status: 500 }
    )
  }
}
