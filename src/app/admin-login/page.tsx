'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supabase, setSupabase] = useState<any>(null)
  
  useEffect(() => {
    // Initialize Supabase client
    try {
      const client = createBrowserSupabaseClient()
      console.log('✅ Supabase client initialized')
      setSupabase(client)
    } catch (err) {
      console.error('❌ Failed to initialize Supabase client:', err)
      setError('인증 서비스를 초기화할 수 없습니다. 페이지를 새로고침해주세요.')
    }
  }, [])
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 입력값 검증
    if (!email || !email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    if (!password || !password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }
    
    setLoading(true)
    setError('')
    
    // Check if Supabase client is ready
    if (!supabase) {
      setError('인증 서비스를 초기화하는 중입니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
      return
    }
    
    try {
      console.log('[1/6] 🔐 Starting admin login for:', email.trim())
      console.log('[1/6] 📋 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET')
      console.log('[1/6] 📋 Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')

      // Step 1: Sign in with timeout
      console.log('[2/6] 🔑 Attempting signInWithPassword...')
      console.log('[2/6] 📤 Supabase client:', supabase ? 'exists' : 'missing')
      console.log('[2/6] 📤 Supabase auth:', supabase?.auth ? 'exists' : 'missing')
      
      let authData: any = null
      let authError: any = null
      
      try {
        // Add timeout to prevent hanging
        console.log('[2/6] 🚀 Creating signIn promise...')
        console.log('[2/6] 📧 Email:', email.trim())
        console.log('[2/6] 🔑 Password length:', password.length)

        const signInPromise = supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        }).then((res: any) => {
          console.log('[2/6] ✅ SignIn promise resolved')
          console.log('[2/6] 📦 Response type:', typeof res)
          console.log('[2/6] 📦 Response keys:', res ? Object.keys(res) : 'null')
          return res
        }).catch((err: any) => {
          console.error('[2/6] ❌ SignIn promise rejected:', err)
          throw err
        })

        console.log('[2/6] ⏰ Promise created, setting timeout...')

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => {
            console.error('[2/6] ⏰ TIMEOUT TRIGGERED!')
            reject(new Error('로그인 요청이 시간 초과되었습니다 (30초)'))
          }, 30000)
        )

        console.log('[2/6] ⏳ Waiting for signIn response (race condition)...')
        const result = await Promise.race([signInPromise, timeoutPromise]) as any
        console.log('[2/6] 🏁 Race completed!')

        authData = result.data
        authError = result.error
        
        console.log('[2/6] 📥 SignIn response received')
        console.log('[2/6] 📋 Response data:', authData ? 'exists' : 'null')
        console.log('[2/6] 📋 Response error:', authError ? authError.message : 'none')
        
      } catch (err: any) {
        console.error('[2/6] ❌ Exception during signIn:', err)
        console.error('[2/6] Error type:', typeof err)
        console.error('[2/6] Error message:', err?.message)
        console.error('[2/6] Error stack:', err?.stack)
        
        if (err?.message?.includes('시간 초과')) {
          setError('로그인 요청이 시간 초과되었습니다. 네트워크 연결을 확인해주세요.')
        } else {
          setError(`로그인 중 오류가 발생했습니다: ${err?.message || '알 수 없는 오류'}`)
        }
        setLoading(false)
        return
      }
      
      if (authError) {
        console.error('[2/6] ❌ Auth error:', authError)
        console.error('[2/6] Error status:', authError.status)
        console.error('[2/6] Error message:', authError.message)
        console.error('[2/6] Error code:', authError.code)
        
        let errorMessage = '로그인에 실패했습니다.'
        if (authError.message?.includes('Invalid login credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        } else if (authError.message?.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 완료되지 않았습니다.'
        } else {
          errorMessage = authError.message || errorMessage
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (!authData?.user) {
        console.error('[2/6] ❌ No user data returned')
        console.error('[2/6] AuthData:', authData)
        setError('로그인 정보를 확인할 수 없습니다.')
        setLoading(false)
        return
      }

      console.log('[2/6] ✅ Auth successful, user ID:', authData.user.id)

      // Step 2: Use session from auth response instead of getSession()
      console.log('[3/6] 📋 Checking session from auth response...')
      const session = authData.session

      if (!session) {
        console.error('[3/6] ❌ No session in auth response')
        console.error('[3/6] 📋 AuthData keys:', Object.keys(authData))
        setError('세션을 가져올 수 없습니다. 다시 시도해주세요.')
        setLoading(false)
        return
      }

      console.log('[3/6] ✅ Session obtained from auth response')
      console.log('[3/6] 📋 Access token length:', session.access_token?.length || 0)
      console.log('[3/6] 📋 Refresh token length:', session.refresh_token?.length || 0)
      
      // Step 3: Set session cookies on server
      console.log('[4/6] 🍪 Setting session cookies on server...')
      try {
        const setSessionResponse = await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        })
        
        if (!setSessionResponse.ok) {
          const errorData = await setSessionResponse.json().catch(() => ({}))
          console.warn('[4/6] ⚠️ Failed to set session cookies:', errorData)
          // Continue anyway - cookies might still work
        } else {
          console.log('[4/6] ✅ Session cookies set')
        }
      } catch (setSessionErr) {
        console.warn('[4/6] ⚠️ Exception setting cookies:', setSessionErr)
        // Continue anyway
      }
      
      // Step 4: Check admin status via server API
      console.log('[5/6] 🔍 Checking admin status...')
      try {
        const checkResponse = await fetch('/api/auth/check-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: authData.user.id
          }),
        })
        
        if (!checkResponse.ok) {
          const errorData = await checkResponse.json().catch(() => ({}))
          console.error('[5/6] ❌ Admin check failed:', errorData)
          
          if (checkResponse.status === 404) {
            setError('사용자 정보를 찾을 수 없습니다. 먼저 일반 로그인(/auth/login)을 통해 계정을 생성해주세요.')
          } else if (checkResponse.status === 401) {
            setError('인증에 실패했습니다. 쿠키가 설정되지 않았을 수 있습니다.')
          } else {
            setError(`관리자 권한 확인 실패: ${errorData.error || '알 수 없는 오류'}`)
          }
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        
        const checkData = await checkResponse.json()
        console.log('[5/6] 📋 Admin check result:', checkData)

        if (!checkData.isAdmin) {
          console.warn('[5/6] ⚠️ User is not admin')
          await supabase.auth.signOut()
          setError(`관리자 권한이 없습니다. (역할: ${checkData.userData?.role || '없음'}, 관리자: ${checkData.userData?.is_admin || false})`)
          setLoading(false)
          return
        }

        console.log('[5/6] ✅ Admin verified successfully!')
        console.log('[5/6] 👤 User role:', checkData.userData.role)
        console.log('[5/6] 🔐 Is admin:', checkData.userData.is_admin)
      } catch (checkErr: any) {
        console.error('[5/6] ❌ Exception checking admin:', checkErr)
        setError(`관리자 권한 확인 중 오류: ${checkErr?.message || '알 수 없는 오류'}`)
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      
      // Step 5: Wait a bit for cookies to propagate
      console.log('[6/6] ⏳ Waiting for cookies to propagate...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 6: Redirect
      console.log('[6/6] 🔄 Redirecting to /admin')
        window.location.href = '/admin'
      
    } catch (err: any) {
      console.error('❌ Unexpected error:', err)
      console.error('Error stack:', err.stack)
      setError(err.message || '로그인 중 예상치 못한 오류가 발생했습니다.')
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">관리자 로그인</CardTitle>
          <CardDescription>슈퍼 관리자 전용 접속 페이지</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="admin@startupmatching.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '관리자 로그인'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>보안 주의사항:</strong><br />
              • 관리자 계정은 승인된 담당자만 사용 가능합니다<br />
              • 모든 관리자 활동은 로그로 기록됩니다<br />
              • 비정상적인 접근 시도는 차단될 수 있습니다
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-800">
              ← 메인 페이지로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}