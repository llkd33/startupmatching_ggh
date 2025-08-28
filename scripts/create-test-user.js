const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTestUser() {
  try {
    // Try to sign up a test user
    const testEmail = 'test@example.com'
    const testPassword = 'Test1234!'
    
    console.log('Attempting to create test user...')
    console.log('Email:', testEmail)
    console.log('Password:', testPassword)
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          role: 'expert',
          name: 'Test User'
        }
      }
    })
    
    if (error) {
      console.error('Error creating user:', error.message)
      
      // If user exists, try to sign in
      if (error.message.includes('already registered')) {
        console.log('\nUser already exists, trying to sign in...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })
        
        if (signInError) {
          console.error('Sign in error:', signInError.message)
        } else {
          console.log('Successfully signed in!')
          console.log('User ID:', signInData.user?.id)
        }
      }
    } else {
      console.log('User created successfully!')
      console.log('User ID:', data.user?.id)
      console.log('Email:', data.user?.email)
      console.log('\nNote: You may need to confirm the email address.')
      console.log('Use these credentials to test login:')
      console.log(`Email: ${testEmail}`)
      console.log(`Password: ${testPassword}`)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createTestUser()