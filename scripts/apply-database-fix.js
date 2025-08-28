#!/usr/bin/env node

/**
 * Apply Database Fix
 * 
 * This script helps apply the database fix by providing instructions
 * and testing the current state.
 * 
 * Usage: node scripts/apply-database-fix.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

console.log('🔧 Database Fix Helper\n')

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

console.log('📋 Current Status:')
console.log(`   🌐 Supabase URL: ${supabaseUrl}`)
console.log(`   📁 Project: ${path.basename(process.cwd())}\n`)

console.log('🚀 Steps to Fix Database Issues:\n')

console.log('1️⃣  Test Current State:')
console.log('   Run: node scripts/test-database-functions.js')
console.log('   This will show which functions/tables are missing.\n')

console.log('2️⃣  Apply Database Fix:')
console.log('   a) Go to your Supabase dashboard:')
console.log(`      ${supabaseUrl.replace('/rest/v1', '')}/project/default/sql`)
console.log('   b) Open SQL Editor')
console.log('   c) Copy and paste the contents of:')
console.log('      📄 supabase/fix_remaining_issues.sql')
console.log('   d) Click "Run" to execute the SQL\n')

console.log('3️⃣  Verify the Fix:')
console.log('   Run: node scripts/test-database-functions.js')
console.log('   All tests should pass (100% success rate)\n')

console.log('📁 Available SQL Fix Files:')
const sqlFiles = [
  'supabase/fix_remaining_issues.sql',
  'supabase/complete_database_fix.sql',
  'supabase/fix_missing_functions.sql'
]

sqlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file)
    const size = Math.round(stats.size / 1024)
    console.log(`   ✅ ${file} (${size}KB)`)
  } else {
    console.log(`   ❌ ${file} (missing)`)
  }
})

console.log('\n📖 For detailed instructions, see:')
console.log('   📄 supabase/README_DATABASE_FIX.md\n')

console.log('⚠️  Important Notes:')
console.log('   • Always backup your database before applying fixes')
console.log('   • Test in development environment first')
console.log('   • The fix is safe and uses CREATE OR REPLACE / IF NOT EXISTS')
console.log('   • Contact support if you encounter issues\n')

console.log('🎯 Quick Start:')
console.log('   1. node scripts/test-database-functions.js')
console.log('   2. Apply supabase/fix_remaining_issues.sql in Supabase SQL Editor')
console.log('   3. node scripts/test-database-functions.js (verify)')