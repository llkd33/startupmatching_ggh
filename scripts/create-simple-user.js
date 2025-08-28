const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAndTestUser() {
  // Generate unique email
  const timestamp = Date.now()
  const testEmail = `test${timestamp}@example.com`
  const testPassword = 'TestPassword123!'
  
  console.log('Creating test user...')
  console.log('Email:', testEmail)
  console.log('Password:', testPassword)
  console.log('---')
  
  try {
    // Try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3009/dashboard',
        data: {
          role: 'expert',
          name: 'Test User'
        }
      }
    })
    
    if (signUpError) {
      console.error('Sign up error:', signUpError.message)
      
      // If database error, try without metadata
      if (signUpError.message.includes('Database')) {
        console.log('\nRetrying without metadata...')
        const { data: retryData, error: retryError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword
        })
        
        if (retryError) {
          console.error('Retry error:', retryError.message)
        } else {
          console.log('✅ User created (without metadata)!')
          console.log('User ID:', retryData.user?.id)
        }
      }
    } else {
      console.log('✅ User created successfully!')
      console.log('User ID:', signUpData.user?.id)
      console.log('Session:', signUpData.session ? 'Active' : 'Needs email confirmation')
      
      // If email confirmation is disabled, try to sign in immediately
      if (signUpData.session) {
        console.log('\n✅ You can now login with:')
        console.log('URL: http://localhost:3009/auth/login')
        console.log('Email:', testEmail)
        console.log('Password:', testPassword)
      } else {
        console.log('\n⚠️ Email confirmation may be required.')
        console.log('Check if email confirmation is disabled in Supabase dashboard:')
        console.log('Authentication > Settings > Email Auth > Confirm email = OFF')
        
        // Try to sign in anyway
        console.log('\nTrying to sign in...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })
        
        if (signInError) {
          console.log('Sign in error:', signInError.message)
        } else {
          console.log('✅ Sign in successful!')
          console.log('You can login at: http://localhost:3009/auth/login')
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Also provide a pre-made account for testing
console.log('=== Pre-configured Test Account ===')
console.log('If user creation fails, try this account:')
console.log('Email: test@example.com')
console.log('Password: Test1234!')
console.log('(You need to create this in Supabase Dashboard)')
console.log()
console.log('=== Creating New Test Account ===')

createAndTestUser()