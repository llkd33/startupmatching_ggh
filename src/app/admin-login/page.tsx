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
    setLoading(true)
    setError('')
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Admin login attempt:', email)
      }

      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      
      if (authError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Auth error:', authError)
        }
        throw authError
      }

      if (!authData?.user) {
        throw new Error('로그인 정보를 확인할 수 없습니다.')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Auth successful, checking admin status for user:', authData.user.id)
      }
      
      // Check if user is admin (is_admin = true OR role = 'admin')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin, role')
        .eq('id', authData.user.id)
        .single()
      
      if (userError) {
        // users 테이블에 레코드가 없을 수 있음
        console.error('User data error:', userError)
        if (process.env.NODE_ENV === 'development') {
          console.error('User error details:', {
            code: userError.code,
            message: userError.message,
            details: userError.details,
            hint: userError.hint
          })
        }
        throw new Error('사용자 정보를 찾을 수 없습니다. 먼저 일반 로그인을 시도해주세요.')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('User data:', userData)
      }
      
      // is_admin = true 또는 role = 'admin' 확인
      const isAdmin = userData?.is_admin === true || userData?.role === 'admin'
      
      if (!isAdmin) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('User is not admin:', { is_admin: userData?.is_admin, role: userData?.role })
        }
        await supabase.auth.signOut()
        throw new Error('관리자 권한이 없습니다. 관리자 계정으로 로그인해주세요.')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Admin verified, logging action and redirecting...')
      }
      
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
          console.warn('Failed to log admin login action:', logError)
        }
      } catch (logError) {
        // admin_logs 테이블이 없거나 RLS 정책 문제가 있어도 로그인은 진행
        console.warn('Exception logging admin login action:', logError)
      }
      
      // 리다이렉트 (window.location.href 사용하여 확실한 페이지 이동)
      if (typeof window !== 'undefined') {
        if (process.env.NODE_ENV === 'development') {
          console.log('Redirecting to /admin')
        }
        window.location.href = '/admin'
      } else {
        router.push('/admin')
      }
    } catch (err: any) {
      console.error('Admin login error:', err)
      setError(err.message || '로그인 중 오류가 발생했습니다')
      setLoading(false) // 에러 발생 시 로딩 해제
    }
    // finally는 window.location.href 사용 시 실행되지 않을 수 있으므로 제거
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