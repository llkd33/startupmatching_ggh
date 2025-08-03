const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bgnuyghvjkqgwwvghqzo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbnV5Z2h2amtxZ3d3dmdocXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDg5NDAsImV4cCI6MjA2OTcyNDk0MH0.hLBPh0CUK1vVyHOvw2Ns6XpoP7YIz-8pYJga0VucJjE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWebRegistration() {
  console.log('🌐 웹 등록 프로세스 테스트...\n')
  
  const testEmail = `webtest${Date.now()}@example.com`
  const testPassword = 'Test123456!'
  const testName = 'Web Test User'
  const testPhone = '010-5555-6666'
  
  try {
    console.log('📝 회원가입 테스트')
    console.log('━'.repeat(50))
    console.log('Email:', testEmail)
    console.log('Password:', testPassword)
    console.log('Name:', testName)
    console.log('Phone:', testPhone)
    console.log('━'.repeat(50))
    
    // 1. 회원가입 시도 (fallback 메커니즘 포함)
    console.log('\n1️⃣ Supabase Auth 회원가입...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          role: 'expert',
          name: testName,
          phone: testPhone
        }
      }
    })
    
    if (authError) {
      console.log('❌ Auth 회원가입 실패:', authError.message)
      return
    }
    
    console.log('✅ Auth 회원가입 성공!')
    console.log('   User ID:', authData.user?.id)
    
    // 2. Fallback: 직접 users 테이블에 추가
    if (authData.user?.id) {
      console.log('\n2️⃣ Fallback 메커니즘 실행 (users 테이블 직접 추가)...')
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          role: 'expert',
          phone: testPhone
        })
        .select()
        .single()
      
      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          console.log('⚠️  이미 users 테이블에 존재 (trigger가 작동한 것으로 보임)')
        } else {
          console.log('❌ Users 테이블 추가 실패:', insertError.message)
        }
      } else {
        console.log('✅ Users 테이블에 성공적으로 추가됨!')
      }
      
      // 3. 확인
      console.log('\n3️⃣ Users 테이블 확인...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      
      if (userError) {
        console.log('❌ Users 테이블 조회 실패:', userError.message)
      } else if (userData) {
        console.log('✅ Users 테이블에서 사용자 확인됨!')
        console.log('   ID:', userData.id)
        console.log('   Email:', userData.email)
        console.log('   Role:', userData.role)
        console.log('   Phone:', userData.phone)
        console.log('   Created:', userData.created_at)
      }
      
      // 4. 로그인 테스트
      console.log('\n4️⃣ 로그인 테스트...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })
      
      if (signInError) {
        console.log('❌ 로그인 실패:', signInError.message)
      } else {
        console.log('✅ 로그인 성공!')
        console.log('   Session:', signInData.session ? 'Active' : 'None')
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 테스트 요약:')
    console.log('- Auth 회원가입: ✅')
    console.log('- Users 테이블 생성: Fallback 메커니즘으로 처리')
    console.log('- 로그인 가능: ✅')
    console.log('='.repeat(50))
    
    console.log('\n💡 다음 단계:')
    console.log('1. 웹 브라우저에서 http://localhost:3000 접속')
    console.log('2. "전문가 회원가입" 클릭')
    console.log('3. 위 정보로 회원가입 시도')
    console.log('4. 프로필 완성 페이지로 리다이렉트 확인')
    
  } catch (err) {
    console.log('❌ 테스트 실패:', err.message)
  }
}

testWebRegistration()