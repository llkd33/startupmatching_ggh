'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
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
    
    try {
      console.log('🔐 Admin login attempt:', email.trim())

      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      
      if (authError) {
        console.error('❌ Auth error:', authError)
        console.error('Error code:', authError.status)
        console.error('Error message:', authError.message)
        
        // 사용자 친화적인 에러 메시지
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
        console.error('❌ No user data returned')
        setError('로그인 정보를 확인할 수 없습니다.')
        setLoading(false)
        return
      }

      console.log('✅ Auth successful, user ID:', authData.user.id)
      
      // Check if user is admin (is_admin = true OR role = 'admin')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin, role')
        .eq('id', authData.user.id)
        .maybeSingle() // single() 대신 maybeSingle() 사용하여 레코드 없을 때 에러 방지
      
      if (userError) {
        console.error('❌ User data error:', userError)
        console.error('Error code:', userError.code)
        console.error('Error message:', userError.message)
        
        // PGRST116은 "no rows found" - 이 경우 users 테이블에 레코드가 없음
        if (userError.code === 'PGRST116') {
          setError('사용자 정보를 찾을 수 없습니다. 먼저 일반 로그인(/auth/login)을 통해 계정을 생성해주세요.')
        } else {
          setError(`사용자 정보 조회 실패: ${userError.message}`)
        }
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      console.log('📋 User data:', userData)
      
      // users 테이블에 레코드가 없는 경우
      if (!userData) {
        console.warn('⚠️ User record not found in users table')
        setError('사용자 정보를 찾을 수 없습니다. 먼저 일반 로그인(/auth/login)을 통해 계정을 생성해주세요.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      
      // is_admin = true 또는 role = 'admin' 확인
      const isAdmin = userData.is_admin === true || userData.role === 'admin'
      
      console.log('🔍 Admin check:', { 
        is_admin: userData.is_admin, 
        role: userData.role, 
        isAdmin 
      })
      
      if (!isAdmin) {
        console.warn('⚠️ User is not admin:', { 
          is_admin: userData.is_admin, 
          role: userData.role 
        })
        await supabase.auth.signOut()
        setError(`관리자 권한이 없습니다. (현재 역할: ${userData.role || '없음'}, 관리자: ${userData.is_admin || false})`)
        setLoading(false)
        return
      }

      console.log('✅ Admin verified, preparing redirect...')
      
      // Log admin action (실패해도 로그인은 진행)
      try {
        const { error: logError } = await supabase
          .from('admin_logs')
          .insert({
            admin_id: authData.user.id,
            action: 'ADMIN_LOGIN',
            details: { timestamp: new Date().toISOString() }
          })
        
        if (logError) {
          console.warn('⚠️ Failed to log admin login action:', logError)
        } else {
          console.log('✅ Admin login logged')
        }
      } catch (logError) {
        console.warn('⚠️ Exception logging admin login action:', logError)
      }
      
      // 세션을 확실히 설정하기 위해 잠시 대기
      console.log('⏳ Waiting for session to be set...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
      }
      
      if (!session) {
        console.error('❌ Session not found after login')
        // 세션이 없어도 리다이렉트 시도 (쿠키는 이미 설정되었을 수 있음)
        console.log('⚠️ Proceeding with redirect despite no session (cookies may be set)')
      } else {
        console.log('✅ Session confirmed:', session.user.id)
      }
      
      // 리다이렉트 (window.location.replace 사용하여 확실한 페이지 이동)
      console.log('🔄 Redirecting to /admin')
      if (typeof window !== 'undefined') {
        // replace 대신 href 사용하고, 강제 리로드
        window.location.href = '/admin'
        // 추가 안전장치: 2초 후에도 리다이렉트가 안 되면 강제 리로드
        setTimeout(() => {
          if (window.location.pathname === '/admin-login') {
            console.warn('⚠️ Redirect failed, forcing reload')
            window.location.reload()
          }
        }, 2000)
      } else {
        router.push('/admin')
      }
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