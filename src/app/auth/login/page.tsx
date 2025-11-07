'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

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
import { UserRole } from '@/types/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Array<{
    role: 'expert' | 'organization'
    name: string
    hasProfile: boolean
    isProfileComplete: boolean
  }>>([])
  const [selectedRole, setSelectedRole] = useState<'expert' | 'organization' | null>(null)
  const [registerType, setRegisterType] = useState<'expert' | 'organization' | null>(null)

  // URL 쿼리 파라미터에서 이메일과 타입 가져오기
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const typeParam = searchParams.get('type') as 'expert' | 'organization' | null
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
    if (typeParam === 'expert' || typeParam === 'organization') {
      setRegisterType(typeParam)
    }
  }, [searchParams])

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

      const metadataRole = data.user.user_metadata?.role as UserRole | undefined

      // 사용자 정보 가져오기 (에러 처리 포함)
      const userResult = await browserSupabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (userResult.error && !(userResult.error.code === 'PGRST116' || userResult.error.message?.includes('406'))) {
        throw userResult.error
      }

      let resolvedRole = (userResult.data?.role as UserRole | undefined) ?? metadataRole

      if (!userResult.data?.role) {
        const fallbackRole: UserRole = resolvedRole ?? 'organization'
        
        // Ensure we have valid data before upserting
        const userEmail = data.user.email
        if (!userEmail || userEmail.trim() === '') {
          throw new Error('이메일 정보가 없습니다. 다시 로그인해주세요.')
        }

        // Validate role
        const validRoles: UserRole[] = ['expert', 'organization', 'admin']
        if (!validRoles.includes(fallbackRole)) {
          throw new Error('유효하지 않은 사용자 역할입니다.')
        }

        const session = data.session ?? (await browserSupabase.auth.getSession()).data.session
        const accessToken = session?.access_token

        if (!accessToken) {
          throw new Error('세션 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        }

        let backfillResponse: Response
        try {
          backfillResponse = await fetch('/api/auth/backfill-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              role: fallbackRole,
              phone: data.user.user_metadata?.phone ?? null,
            }),
          })
        } catch (networkError) {
          console.error('Failed to backfill user record (network error):', networkError)
          throw new Error('사용자 정보를 동기화하지 못했습니다. 네트워크 상태를 확인 후 다시 시도해주세요.')
        }

        if (!backfillResponse.ok) {
          let errorPayload: unknown = null
          try {
            errorPayload = await backfillResponse.json()
          } catch (parseError) {
            console.error('Failed to parse backfill error response:', parseError)
          }

          console.error('Failed to backfill user record:', errorPayload || backfillResponse.statusText)
          console.error('Attempted data:', {
            id: data.user.id,
            email: userEmail,
            role: fallbackRole,
            phone: data.user.user_metadata?.phone ?? null,
          })

          const payloadObject =
            typeof errorPayload === 'object' && errorPayload !== null
              ? (errorPayload as Record<string, unknown>)
              : null
          const serverMessage =
            payloadObject && typeof payloadObject.error === 'string'
              ? payloadObject.error
              : null
          throw new Error(serverMessage || '사용자 정보를 동기화하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        }

        try {
          const result: unknown = await backfillResponse.json()
          if (typeof result === 'object' && result !== null) {
            const payloadUser = (result as Record<string, unknown>).user
            if (typeof payloadUser === 'object' && payloadUser !== null) {
              const maybeRole = (payloadUser as Record<string, unknown>).role
              const syncedRole = typeof maybeRole === 'string' ? (maybeRole as UserRole) : undefined
              resolvedRole = syncedRole ?? fallbackRole
            } else {
              resolvedRole = fallbackRole
            }
          } else {
            resolvedRole = fallbackRole
          }
        } catch (parseError) {
          console.error('Failed to parse backfill response:', parseError)
          resolvedRole = fallbackRole
        }
      }

      // 사용자가 가진 프로필 확인 (클라이언트에서 직접 확인)
      const [expertProfileResult, orgProfileResult] = await Promise.all([
        browserSupabase
          .from('expert_profiles')
          .select('id, name, is_profile_complete')
          .eq('user_id', data.user.id)
          .maybeSingle(),
        browserSupabase
          .from('organization_profiles')
          .select('id, organization_name, is_profile_complete')
          .eq('user_id', data.user.id)
          .maybeSingle(),
      ])

      const availableRoles: Array<{
        role: 'expert' | 'organization'
        name: string
        hasProfile: boolean
        isProfileComplete: boolean
      }> = []

      if (expertProfileResult.data) {
        availableRoles.push({
          role: 'expert',
          name: expertProfileResult.data.name || '전문가',
          hasProfile: true,
          isProfileComplete: expertProfileResult.data.is_profile_complete ?? false,
        })
      }

      if (orgProfileResult.data) {
        availableRoles.push({
          role: 'organization',
          name: orgProfileResult.data.organization_name || '기관',
          hasProfile: true,
          isProfileComplete: orgProfileResult.data.is_profile_complete ?? false,
        })
      }

      // users 테이블의 역할도 확인 (프로필이 없을 경우 fallback)
      if (userResult.data?.role) {
        const roleExists = availableRoles.some((r) => r.role === userResult.data.role)
        if (!roleExists) {
          if (userResult.data.role === 'expert') {
            availableRoles.push({
              role: 'expert',
              name: '전문가',
              hasProfile: false,
              isProfileComplete: false,
            })
          } else if (userResult.data.role === 'organization') {
            availableRoles.push({
              role: 'organization',
              name: '기관',
              hasProfile: false,
              isProfileComplete: false,
            })
          }
        }
      }

      // 프로필이 없으면 기본 역할 사용
      if (availableRoles.length === 0) {
        if (!resolvedRole) {
          throw new Error('사용자 역할 정보를 확인할 수 없습니다. 관리자에게 문의해주세요.')
        }
        const role = resolvedRole as 'expert' | 'organization'
        await handleRoleLogin(role, data.user.id)
        return
      }

      // 프로필이 하나면 바로 로그인
      if (availableRoles.length === 1) {
        await handleRoleLogin(availableRoles[0].role, data.user.id)
        return
      }

      // 프로필이 여러 개면 역할 선택 UI 표시
      setAvailableRoles(availableRoles)
      setShowRoleSelection(true)
      setLoading(false)
      toast.success('로그인되었습니다! 어떤 역할로 접속하시겠어요?')
    } catch (err: unknown) {
      console.error('Login error:', err)

      let errorMessage = '로그인 중 오류가 발생했습니다.'

      const errorObject = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null
      const message = typeof errorObject?.message === 'string' ? errorObject.message : null
      const status = typeof errorObject?.status === 'number' ? errorObject.status : null

      // Supabase 에러 메시지를 더 친근하게 변환
      if (message?.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (message?.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
      } else if (message?.includes('User not found')) {
        errorMessage = '등록되지 않은 사용자입니다.'
      } else if (status === 401) {
        errorMessage = '인증에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      } else if (message) {
        errorMessage = message
      }

      setError(errorMessage)
      toast.error(errorMessage)
      setIsRedirecting(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleLogin = async (role: 'expert' | 'organization', userId: string) => {
    setIsRedirecting(true)
    setLoading(true)

    try {
      // 선택한 역할을 세션 스토리지에 저장 (다른 탭과 공유되지 않음)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_role', role)
      }

      // 역할에 따라 프로필 확인
      let profileComplete = true
      if (role === 'expert') {
        const { data: expertProfile } = await browserSupabase
          .from('expert_profiles')
          .select('is_profile_complete')
          .eq('user_id', userId)
          .maybeSingle()
        profileComplete = expertProfile?.is_profile_complete ?? false
      } else if (role === 'organization') {
        const { data: orgProfile } = await browserSupabase
          .from('organization_profiles')
          .select('is_profile_complete')
          .eq('user_id', userId)
          .maybeSingle()
        profileComplete = orgProfile?.is_profile_complete ?? false
      }

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
    } catch (err) {
      console.error('Role login error:', err)
      toast.error('로그인 처리 중 오류가 발생했습니다.')
      setIsRedirecting(false)
      setLoading(false)
    }
  }

  const handleRoleSelect = async (role: 'expert' | 'organization') => {
    setSelectedRole(role)
    const { data: { user } } = await browserSupabase.auth.getUser()
    if (user) {
      await handleRoleLogin(role, user.id)
    }
  }

  // 역할 선택 UI가 표시되면 폼 대신 역할 선택 화면 표시
  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <UserCheck className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">역할을 선택해주세요</CardTitle>
              <CardDescription className="text-center">
                어떤 역할로 접속하시겠어요?
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {availableRoles.map((roleInfo) => (
                  <button
                    key={roleInfo.role}
                    onClick={() => handleRoleSelect(roleInfo.role)}
                    disabled={isRedirecting || loading}
                    className={`
                      p-6 rounded-lg border-2 transition-all
                      ${selectedRole === roleInfo.role 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }
                      ${isRedirecting || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`
                        p-3 rounded-lg
                        ${roleInfo.role === 'expert' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-purple-100 text-purple-600'
                        }
                      `}>
                        {roleInfo.role === 'expert' ? (
                          <UserCheck className="w-6 h-6" />
                        ) : (
                          <Building className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-lg mb-1">
                          {roleInfo.role === 'expert' ? '전문가' : '기관'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {roleInfo.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs">
                          {roleInfo.hasProfile ? (
                            <>
                              {roleInfo.isProfileComplete ? (
                                <span className="text-green-600">✓ 프로필 완료</span>
                              ) : (
                                <span className="text-orange-600">⚠ 프로필 미완료</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">프로필 없음</span>
                          )}
                        </div>
                      </div>
                      {isRedirecting && selectedRole === roleInfo.role && (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setShowRoleSelection(false)
                  setEmail('')
                  setPassword('')
                }}
                className="w-full"
                disabled={isRedirecting || loading}
              >
                다른 계정으로 로그인
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
            {registerType ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                  <div className="text-sm font-semibold text-blue-900 mb-2 text-center">
                    {registerType === 'expert' ? '👤 전문가로 시작하기' : '🏢 기관으로 시작하기'}
                  </div>
                  <div className="text-xs text-blue-700 text-center mb-4">
                    계정이 없으시다면 아래 버튼을 눌러 가입해주세요
                  </div>
                  <Link href={`/auth/register/${registerType}`} className="w-full block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      {registerType === 'expert' ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          전문가로 가입하기
                        </>
                      ) : (
                        <>
                          <Building className="w-4 h-4 mr-2" />
                          기관으로 가입하기
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
                <div className="text-xs text-center text-gray-500">
                  이미 계정이 있으신가요? 위에서 로그인해주세요
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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

export default function LoginPage() {
  // 개발 모드 체크 (환경 변수 또는 쿼리 파라미터)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const showDevMode = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('dev') === 'true' || 
     localStorage.getItem('enable_dev_mode') === 'true')
  
  if (isDevelopment && showDevMode) {
    return <DevModeLogin />
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
