const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testConnection() {
  try {
    console.log('🧪 Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    return false
  }
}

async function testFunctions() {
  try {
    console.log('🧪 Testing RPC functions...')
    
    // Test notification count function
    const { data: notifData, error: notifError } = await supabase
      .rpc('get_unread_notification_count')
    
    if (notifError) {
      console.log('⚠️  Notification count function missing:', notifError.message)
      return false
    }
    
    // Test message count function
    const { data: msgData, error: msgError } = await supabase
      .rpc('get_unread_message_count')
    
    if (msgError) {
      console.log('⚠️  Message count function missing:', msgError.message)
      return false
    }
    
    console.log('✅ All RPC functions working')
    console.log('📊 Notification count:', notifData)
    console.log('📊 Message count:', msgData)
    return true
  } catch (error) {
    console.error('❌ Function test failed:', error.message)
    return false
  }
}

async function applyDatabaseFix() {
  try {
    console.log('🔧 Applying database fix...')
    
    // Read the SQL fix file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'minimal_fix.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Failed to apply database fix:', error.message)
      console.log('💡 Please run the SQL manually in Supabase SQL Editor:')
      console.log('📁 File: supabase/minimal_fix.sql')
      return false
    }
    
    console.log('✅ Database fix applied successfully')
    return true
  } catch (error) {
    console.error('❌ Error applying fix:', error.message)
    console.log('💡 Please run the SQL manually in Supabase SQL Editor:')
    console.log('📁 File: supabase/minimal_fix.sql')
    return false
  }
}

async function main() {
  console.log('🚀 Starting database diagnosis and fix...\n')
  
  // Test connection
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.log('\n❌ Cannot proceed without database connection')
    process.exit(1)
  }
  
  console.log('')
  
  // Test functions
  const functionsOk = await testFunctions()
  
  if (!functionsOk) {
    console.log('\n🔧 Functions missing, applying fix...')
    const fixApplied = await applyDatabaseFix()
    
    if (fixApplied) {
      console.log('\n🧪 Re-testing functions...')
      const retestOk = await testFunctions()
      
      if (retestOk) {
        console.log('\n✅ All database issues resolved!')
      } else {
        console.log('\n⚠️  Some issues remain. Please check Supabase logs.')
      }
    }
  } else {
    console.log('\n✅ All database functions are working correctly!')
  }
  
  console.log('\n🎉 Database diagnosis complete!')
}

main().catch(console.error)