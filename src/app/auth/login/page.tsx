'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// 개발 모드 컴포넌트 동적 임포트
const DevModeLogin = dynamic(() => import('./dev-mode'), { ssr: false })
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { browserSupabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff, Loader2, Building, UserCheck } from 'lucide-react'
import { toast } from '@/components/ui/toast-custom'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  // 개발 모드 체크 (환경 변수 또는 쿼리 파라미터)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const showDevMode = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('dev') === 'true' || 
     localStorage.getItem('enable_dev_mode') === 'true')
  
  if (isDevelopment && showDevMode) {
    return <DevModeLogin />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await browserSupabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // 사용자 정보 가져오기 (에러 처리 포함)
      const userResult = await browserSupabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()
      
      // 역할 확인
      const role = userResult.data?.role || data.user.user_metadata?.role
      
      // 역할에 따라 프로필 확인
      let profileComplete = true
      if (role === 'expert') {
        const { data: expertProfile } = await browserSupabase
          .from('expert_profiles')
          .select('is_profile_complete')
          .eq('user_id', data.user.id)
          .single()
        profileComplete = expertProfile?.is_profile_complete ?? false
      } else if (role === 'organization') {
        const { data: orgProfile } = await browserSupabase
          .from('organization_profiles')
          .select('is_profile_complete')
          .eq('user_id', data.user.id)
          .single()
        profileComplete = orgProfile?.is_profile_complete ?? false
      }

      toast.success('로그인되었습니다!')
      setIsRedirecting(true)
      
      // 리다이렉트 경로 결정
      let redirectPath = '/dashboard'
      if (role === 'expert' && !profileComplete) {
        redirectPath = '/profile/expert/complete'
      } else if (role === 'organization' && !profileComplete) {
        redirectPath = '/profile/organization/complete'
      }
      
      // prefetch로 페이지 미리 로드
      router.prefetch(redirectPath)
      router.push(redirectPath)
    } catch (err: any) {
      console.error('Login error:', err)
      
      let errorMessage = '로그인 중 오류가 발생했습니다.'
      
      // Supabase 에러 메시지를 더 친근하게 변환
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
      } else if (err.message?.includes('User not found')) {
        errorMessage = '등록되지 않은 사용자입니다.'
      } else if (err.status === 401) {
        errorMessage = '인증에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      setIsRedirecting(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          홈으로 돌아가기
        </Link>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">다시 만나서 반가워요!</CardTitle>
            <CardDescription className="text-center">
              계정에 로그인하여 서비스를 이용하세요
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 text-base"
                    disabled={loading || isRedirecting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">비밀번호</Label>
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-12 h-12 text-base"
                    disabled={loading || isRedirecting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-3"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base font-medium"
                disabled={loading || isRedirecting}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    이동 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-600">
              아직 계정이 없으신가요?
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <Link href="/auth/register?type=expert" className="w-full">
                <Button variant="outline" className="w-full">
                  <UserCheck className="w-4 h-4 mr-2" />
                  전문가 가입
                </Button>
              </Link>
              <Link href="/auth/register?type=organization" className="w-full">
                <Button variant="outline" className="w-full">
                  <Building className="w-4 h-4 mr-2" />
                  기관 가입
                </Button>
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Trust badges */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>256-bit SSL 암호화로 보호됩니다</p>
          <p className="mt-1">5,000+ 전문가와 1,200+ 기관이 신뢰합니다</p>
        </div>
      </div>
    </div>
  )
}