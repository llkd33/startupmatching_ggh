import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  const adminEmail = 'admin@startupmatching.com'

  console.log('🔍 Checking for admin user:', adminEmail)

  // Check if user exists in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing users:', listError)
    return
  }

  const authUser = users.find(u => u.email === adminEmail)

  if (!authUser) {
    console.error('❌ Admin user not found in auth.users')
    console.log('Please create the user first via Supabase dashboard or signInWithPassword')
    return
  }

  console.log('✅ Admin user found in auth.users:', authUser.id)

  // Check if user exists in public.users
  const { data: publicUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (selectError) {
    console.error('❌ Error checking public.users:', selectError)
    return
  }

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
      console.error('❌ Error creating admin user:', error)
      return
    }

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
      console.error('❌ Error updating admin user:', error)
      return
    }

    console.log('✅ Admin user updated:', data)
  }
}

createAdminUser()
