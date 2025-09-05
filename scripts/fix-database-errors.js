const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client with service role key from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQLFile(fileName) {
  try {
    const filePath = path.join(__dirname, '..', 'supabase', fileName)
    const sql = fs.readFileSync(filePath, 'utf8')
    
    console.log(`\n📄 Executing ${fileName}...`)
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.includes('DO $$') || statement.includes('CREATE OR REPLACE FUNCTION') || statement.includes('CREATE POLICY')) {
        // For complex statements, execute as-is
        const fullStatement = statement + ';'
        console.log(`Executing: ${fullStatement.substring(0, 100)}...`)
        
        const { data, error } = await supabase.rpc('query', { query: fullStatement })
        
        if (error) {
          console.error(`❌ Error: ${error.message}`)
          // Continue with next statement instead of stopping
        } else {
          console.log(`✅ Success`)
        }
      }
    }
    
    console.log(`\n✅ ${fileName} execution completed`)
  } catch (error) {
    console.error(`\n❌ Error executing ${fileName}:`, error.message)
  }
}

async function main() {
  console.log('🔧 Starting database fix...\n')
  
  // First, let's test the connection
  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('count')
    .limit(1)
  
  if (testError) {
    console.error('❌ Connection test failed:', testError.message)
    console.log('\n⚠️  Please run these SQL files manually in Supabase SQL Editor:')
    console.log('1. supabase/fix_rls_policies.sql')
    console.log('2. supabase/fix_campaign_joins.sql')
    return
  }
  
  console.log('✅ Connection test successful')
  
  // Since we can't execute raw SQL directly, let's fix the issues programmatically
  console.log('\n🔧 Applying fixes programmatically...')
  
  // Fix 1: Create organization profiles for all organization users
  console.log('\n📝 Creating missing organization profiles...')
  const { data: orgUsers, error: orgError } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'organization')
  
  if (!orgError && orgUsers) {
    for (const user of orgUsers) {
      const { data: existing } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (!existing) {
        const { error: insertError } = await supabase
          .from('organization_profiles')
          .insert({
            user_id: user.id,
            company_name: user.email || 'Unknown Company',
            organization_name: user.email || 'Unknown Organization'
          })
        
        if (insertError) {
          console.log(`⚠️  Could not create profile for ${user.email}: ${insertError.message}`)
        } else {
          console.log(`✅ Created profile for ${user.email}`)
        }
      }
    }
  }
  
  console.log('\n✅ Database fixes applied!')
  console.log('\n⚠️  Important: You still need to run the RLS policies SQL manually:')
  console.log('1. Go to Supabase Dashboard > SQL Editor')
  console.log('2. Copy and run the content of: supabase/fix_rls_policies.sql')
  console.log('3. Copy and run the content of: supabase/fix_campaign_joins.sql')
}

main().catch(console.error)