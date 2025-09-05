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

async function testRegistration() {
  console.log('🧪 Testing user registration...')
  
  const testEmail = `test${Date.now()}@example.com`
  const testPassword = 'Test123456'
  
  try {
    // Test password mismatch validation (simplified)
    console.log('📝 Testing password validation...')
    
    // Simulate password validation
    function validatePasswords(password, confirmPassword) {
      if (password !== confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다')
      }
      return true
    }
    
    // Test mismatched passwords
    try {
      validatePasswords('Test123456', 'Test123457')
      console.log('❌ Password mismatch should have failed')
    } catch (error) {
      console.log('✅ Password mismatch correctly detected:', error.message)
    }
    
    // Test matching passwords
    try {
      validatePasswords('Test123456', 'Test123456')
      console.log('✅ Matching passwords validated successfully')
    } catch (error) {
      console.log('❌ Matching passwords should not fail:', error.message)
    }
    
    // Test actual registration
    console.log('🔐 Testing Supabase registration...')
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          role: 'expert',
          name: 'Test User',
          phone: '010-1234-5678'
        }
      }
    })
    
    if (error) {
      console.log('❌ Registration failed:', error.message)
      return
    }
    
    console.log('✅ Registration successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('Role:', data.user?.user_metadata?.role)
    
    // Check if user was created in users table
    if (data.user?.id) {
      // Wait a bit for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
      
      if (userError) {
        console.log('❌ Error checking users table:', userError.message)
      } else if (!userData || userData.length === 0) {
        console.log('❌ User not found in users table')
        console.log('   Run the SQL trigger function in Supabase dashboard')
      } else if (userData.length > 1) {
        console.log('⚠️  Multiple records found in users table:', userData.length)
        console.log('   Clean up duplicate records')
      } else {
        console.log('✅ User successfully created in users table:', userData[0])
      }
    }
    
  } catch (err) {
    console.log('❌ Test failed:', err.message)
  }
}

testRegistration()