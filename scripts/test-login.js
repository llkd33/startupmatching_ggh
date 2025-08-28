const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey?.substring(0, 20))

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  // Test with the email from your screenshot
  const testEmail = 'ppp205@naver.com'
  const testPassword = 'password123' // You'll need to use your actual password
  
  console.log('\n=== Testing Login ===')
  console.log('Email:', testEmail)
  
  // First, try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })
  
  if (error) {
    console.error('Login error:', error.message)
    console.error('Error details:', error)
    
    // Try to create a new test account instead
    console.log('\n=== Creating New Test Account ===')
    const newEmail = `test${Date.now()}@example.com`
    const newPassword = 'TestPassword123!'
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: {
          role: 'expert'
        }
      }
    })
    
    if (signUpError) {
      console.error('Sign up error:', signUpError.message)
    } else {
      console.log('✅ Test account created successfully!')
      console.log('Email:', newEmail)
      console.log('Password:', newPassword)
      console.log('User ID:', signUpData.user?.id)
      console.log('\nUse these credentials to test login on http://localhost:3009/auth/login')
    }
  } else {
    console.log('✅ Login successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
  }
}

testLogin()