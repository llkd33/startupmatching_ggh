const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Checking Supabase connection and tables...')
  
  try {
    // Check connection
    const { data, error } = await supabase.from('campaigns').select('count(*)', { count: 'exact', head: true })
    if (error && error.code === '42P01') {
      console.log('❌ campaigns table does not exist')
    } else {
      console.log('✅ campaigns table exists')
    }
  } catch (err) {
    console.log('❌ campaigns table check failed:', err.message)
  }

  try {
    const { data, error } = await supabase.from('expert_profiles').select('count(*)', { count: 'exact', head: true })
    if (error && error.code === '42P01') {
      console.log('❌ expert_profiles table does not exist')
    } else {
      console.log('✅ expert_profiles table exists')
    }
  } catch (err) {
    console.log('❌ expert_profiles table check failed:', err.message)
  }

  try {
    const { data, error } = await supabase.from('connection_requests').select('count(*)', { count: 'exact', head: true })
    if (error && error.code === '42P01') {
      console.log('❌ connection_requests table does not exist')
    } else {
      console.log('✅ connection_requests table exists')
    }
  } catch (err) {
    console.log('❌ connection_requests table check failed:', err.message)
  }

  try {
    const { data, error } = await supabase.from('notifications').select('count(*)', { count: 'exact', head: true })
    if (error && error.code === '42P01') {
      console.log('❌ notifications table does not exist')
    } else {
      console.log('✅ notifications table exists')
    }
  } catch (err) {
    console.log('❌ notifications table check failed:', err.message)
  }

  try {
    const { data, error } = await supabase.from('organization_profiles').select('count(*)', { count: 'exact', head: true })
    if (error && error.code === '42P01') {
      console.log('❌ organization_profiles table does not exist')
    } else {
      console.log('✅ organization_profiles table exists')
    }
  } catch (err) {
    console.log('❌ organization_profiles table check failed:', err.message)
  }

  try {
    const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact', head: true })
    if (error && error.code === '42P01') {
      console.log('❌ users table does not exist')
    } else {
      console.log('✅ users table exists')
    }
  } catch (err) {
    console.log('❌ users table check failed:', err.message)
  }

  console.log('\n📋 Summary:')
  console.log('If any tables are missing, you need to run the SQL migration files in your Supabase dashboard.')
  console.log('\nSQL files to execute:')
  console.log('1. supabase/migrations/001_initial_schema.sql')
  console.log('2. supabase_connection_requests_schema.sql')
  console.log('3. supabase_notifications_schema.sql')
}

checkTables()