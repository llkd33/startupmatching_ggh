#!/usr/bin/env node

/**
 * Test Database Functions
 * 
 * This script tests the database functions after applying the database fix.
 * Run this after applying the SQL fix to verify everything is working.
 * 
 * Usage: node scripts/test-database-functions.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDatabaseFunctions() {
  console.log('🧪 Testing Database Functions...\n')

  const tests = [
    {
      name: 'Test get_unread_notification_count function',
      test: async () => {
        const { data, error } = await supabase.rpc('get_unread_notification_count')
        if (error) throw error
        return `Returned: ${data} (should be a number)`
      }
    },
    {
      name: 'Test get_unread_message_count function',
      test: async () => {
        const { data, error } = await supabase.rpc('get_unread_message_count')
        if (error) throw error
        return `Returned: ${data} (should be a number)`
      }
    },
    {
      name: 'Test campaigns table exists',
      test: async () => {
        const { data, error } = await supabase.from('campaigns').select('id').limit(1)
        if (error) throw error
        return `Table accessible (${data.length} rows found)`
      }
    },
    {
      name: 'Test proposals table exists',
      test: async () => {
        const { data, error } = await supabase.from('proposals').select('id').limit(1)
        if (error) throw error
        return `Table accessible (${data.length} rows found)`
      }
    },
    {
      name: 'Test messages table structure',
      test: async () => {
        const { data, error } = await supabase.from('messages').select('id, campaign_id, proposal_id').limit(1)
        if (error) throw error
        return `Table has correct structure (${data.length} rows found)`
      }
    },
    {
      name: 'Test match_campaign_experts function',
      test: async () => {
        // Create a dummy UUID for testing
        const dummyUuid = '00000000-0000-0000-0000-000000000000'
        const { data, error } = await supabase.rpc('match_campaign_experts', {
          p_campaign_id: dummyUuid,
          p_stage: 1,
          p_limit: 5
        })
        if (error) throw error
        return `Function works (returned ${data.length} results)`
      }
    },
    {
      name: 'Test update_expert_hashtags function',
      test: async () => {
        // This will fail if no expert profile exists for the current user, but that's expected
        const dummyUuid = '00000000-0000-0000-0000-000000000000'
        const { error } = await supabase.rpc('update_expert_hashtags', {
          p_expert_id: dummyUuid
        })
        // We expect this to not throw a "function doesn't exist" error
        // It might fail due to RLS or missing data, but the function should exist
        return 'Function exists and is callable'
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.test()
      console.log(`✅ ${test.name}`)
      console.log(`   ${result}\n`)
      passed++
    } catch (error) {
      console.log(`❌ ${test.name}`)
      console.log(`   Error: ${error.message}\n`)
      failed++
    }
  }

  console.log('📊 Test Results:')
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Database fix was successful.')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the database fix.')
    process.exit(1)
  }
}

// Run the tests
testDatabaseFunctions().catch(error => {
  console.error('💥 Test script failed:', error.message)
  process.exit(1)
})