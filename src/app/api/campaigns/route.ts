import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/types/supabase'

type AdminClient = SupabaseClient<Database>

const ALLOWED_ROLES: readonly UserRole[] = ['expert', 'organization', 'admin']
const ALLOWED_CAMPAIGN_TYPES = new Set(['mentoring', 'investment', 'service'])
const ALLOWED_STATUSES = new Set(['draft', 'active'])

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

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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
    console.error('Failed to verify campaign token:', error)
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user: data.user, response: null }
}

async function syncUserRecord(supabase: AdminClient, user: User) {
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

  const existingRole = normalizeRole(existingUser?.role)
  const metadataRole = normalizeRole(user.user_metadata?.role)
  const role = existingRole === 'admin'
    ? 'admin'
    : metadataRole || existingRole || 'organization'

  const { data: syncedUser, error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email,
        role,
        phone: existingUser?.phone || normalizeNullableText(user.user_metadata?.phone),
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

async function ensureOrganizationProfile(supabase: AdminClient, user: User) {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('organization_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingProfileError) {
    throw existingProfileError
  }

  if (existingProfile) {
    return existingProfile
  }

  const fallbackName =
    normalizeText(user.user_metadata?.organizationName) ||
    normalizeText(user.user_metadata?.organization_name) ||
    user.email?.split('@')[0] ||
    'Organization'

  const { data: createdProfile, error: createError } = await supabase
    .from('organization_profiles')
    .insert({
      user_id: user.id,
      organization_name: fallbackName,
      representative_name:
        normalizeText(user.user_metadata?.representativeName) ||
        normalizeText(user.user_metadata?.representative_name) ||
        fallbackName,
      business_number:
        normalizeNullableText(user.user_metadata?.businessNumber) ||
        normalizeNullableText(user.user_metadata?.business_number),
      contact_position:
        normalizeNullableText(user.user_metadata?.contactPosition) ||
        normalizeNullableText(user.user_metadata?.contact_position),
      is_profile_complete: false,
    })
    .select('id, user_id')
    .single()

  if (createError) {
    throw createError
  }

  return createdProfile
}

async function getCampaignContext(request: NextRequest) {
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

function getCampaignPayload(payload: Record<string, unknown>, organizationId: string) {
  const title = normalizeText(payload.title)
  const description = normalizeText(payload.description)
  const type = normalizeText(payload.type) || 'mentoring'
  const status = normalizeText(payload.status) || 'active'
  const budgetMin = normalizeNumber(payload.budget_min)
  const budgetMax = normalizeNumber(payload.budget_max)

  if (title.length < 5) {
    return { error: '제목은 최소 5자 이상 입력해주세요.' }
  }

  if (description.length < 20) {
    return { error: '설명은 최소 20자 이상 입력해주세요.' }
  }

  if (!ALLOWED_CAMPAIGN_TYPES.has(type)) {
    return { error: '지원하지 않는 캠페인 유형입니다.' }
  }

  if (!ALLOWED_STATUSES.has(status)) {
    return { error: '지원하지 않는 캠페인 상태입니다.' }
  }

  if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) {
    return { error: '최대 예산은 최소 예산보다 크거나 같아야 합니다.' }
  }

  return {
    campaign: {
      title,
      description,
      type,
      category: normalizeNullableText(payload.category),
      keywords: normalizeStringArray(payload.keywords),
      budget_min: budgetMin,
      budget_max: budgetMax,
      start_date: normalizeNullableText(payload.start_date),
      end_date: normalizeNullableText(payload.end_date),
      location: normalizeNullableText(payload.location),
      required_experts: Math.max(1, normalizeNumber(payload.required_experts) || 1),
      organization_id: organizationId,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      status,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getCampaignContext(request)
    if (context.response) return context.response

    let payload: Record<string, unknown>
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const normalized = getCampaignPayload(payload, context.profile.id)
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const { data: campaign, error } = await context.supabase
      .from('campaigns')
      .insert([normalized.campaign])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Failed to create campaign:', error)
    return NextResponse.json(
      { error: '캠페인 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
