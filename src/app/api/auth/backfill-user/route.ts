import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/types/supabase'

const ALLOWED_ROLES: readonly UserRole[] = ['expert', 'organization', 'admin']

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null
  const lower = value.toLowerCase() as UserRole
  return (ALLOWED_ROLES as readonly string[]).includes(lower) ? lower : null
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase configuration is missing for backfill-user route')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = authorization.slice('Bearer '.length).trim()
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { role?: unknown; phone?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !authData.user) {
    console.error('Failed to verify access token during backfill:', authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = authData.user
  const email = user.email
  if (!email) {
    return NextResponse.json({ error: 'User email is missing' }, { status: 400 })
  }

  const roleFromPayload = normalizeRole(payload.role)
  const roleFromMetadata = normalizeRole(user.user_metadata?.role)
  const role: UserRole = roleFromPayload || roleFromMetadata || 'organization'

  const phoneInput = typeof payload.phone === 'string' ? payload.phone : user.user_metadata?.phone
  const phone = typeof phoneInput === 'string' && phoneInput.trim().length > 0 ? phoneInput.trim() : null

  const { data: upsertedUser, error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email,
        role,
        phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, email, role, phone')
    .single()

  if (upsertError) {
    console.error('Service backfill failed:', upsertError)
    return NextResponse.json({ error: 'Failed to sync user record', details: upsertError.message }, { status: 400 })
  }

  return NextResponse.json({ user: upsertedUser })
}
