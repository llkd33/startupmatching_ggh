// Smoke test for /api/auth/backfill-user
// 1) Creates a test user via Supabase Admin (service role)
// 2) Signs in with anon key to obtain an access token
// 3) Calls the local API route with the token to backfill the user
// 4) Confirms the user exists in public.users (service role)

const { createClient } = require('@supabase/supabase-js')
const fetch = global.fetch || require('node-fetch')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing required env vars. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const anon = createClient(SUPABASE_URL, ANON_KEY)

  const timestamp = Date.now()
  const email = `backfill_test_${timestamp}@example.com`
  const password = 'Test1234!'
  const role = 'expert'
  const phone = '010-9999-0000'

  console.log('1) Creating test user via admin...')
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, phone }
  })
  if (createErr) {
    console.error('Failed to create user:', createErr)
    process.exit(1)
  }
  const userId = created.user?.id
  if (!userId) {
    console.error('Admin createUser returned no user id')
    process.exit(1)
  }
  console.log('   ✔ Created user:', userId)

  console.log('2) Signing in to get access token...')
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password })
  if (signInErr) {
    console.error('Failed to sign in:', signInErr)
    process.exit(1)
  }
  const accessToken = signIn.session?.access_token
  if (!accessToken) {
    console.error('No access token returned')
    process.exit(1)
  }
  console.log('   ✔ Got access token')

  console.log('3) Calling backfill API...')
  const res = await fetch(`${APP_URL}/api/auth/backfill-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role, phone })
  })

  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch {}
  if (!res.ok) {
    console.error('Backfill API failed:', res.status, json || text)
    process.exit(1)
  }
  console.log('   ✔ Backfill API response:', json)

  console.log('4) Verifying user row via service role...')
  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('id, email, role, phone')
    .eq('id', userId)
    .single()
  if (userErr) {
    console.error('Failed to load users row:', userErr)
    process.exit(1)
  }
  console.log('   ✔ Users row:', userRow)

  console.log('\n✅ Backfill API smoke test passed')
}

main().catch((e) => {
  console.error('Test crashed:', e)
  process.exit(1)
})
