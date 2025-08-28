const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUsers() {
  try {
    // Check auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
    } else {
      console.log('\n=== Auth Users ===')
      console.log(`Total users: ${authUsers.users.length}`)
      authUsers.users.forEach(user => {
        console.log(`- ${user.email} (${user.id}) - Created: ${user.created_at}`)
      })
    }

    // Check public.users table
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')
      .limit(10)
    
    if (publicError) {
      console.error('Error fetching public users:', publicError)
    } else {
      console.log('\n=== Public Users Table ===')
      console.log(`Users in table: ${publicUsers.length}`)
      publicUsers.forEach(user => {
        console.log(`- ${user.email} (${user.id}) - Role: ${user.role}`)
      })
    }

    // Check if test user exists
    const testEmail = 'ppp205@naver.com'
    const { data: testUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single()
    
    if (testUser) {
      console.log(`\n=== Test User Found ===`)
      console.log(`Email: ${testUser.email}`)
      console.log(`Role: ${testUser.role}`)
      console.log(`ID: ${testUser.id}`)
    } else {
      console.log(`\n=== Test user ${testEmail} not found in database ===`)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkUsers()