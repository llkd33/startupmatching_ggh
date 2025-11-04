'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/toast-custom'

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<any>(null)
  const [userRole, setUserRole] = useState<'expert' | 'organization' | null>(null)
  const [autoLoggedIn, setAutoLoggedIn] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    organization_name: '',
    position: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  // 초대 정보 로드 후 자동 로그인 시도
  useEffect(() => {
    if (invitation && !loading && !error && !autoLoggedIn) {
      autoLogin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, loading, error])

  const autoLogin = async () => {
    if (!invitation || submitting || autoLoggedIn) return

    try {
      // 자동으로 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: invitation.phone.replace(/-/g, '')
      })

      if (signInError) {
        // 자동 로그인 실패 시 사용자에게 수동 로그인 안내
        setError('자동 로그인에 실패했습니다. 아래 정보로 로그인해주세요.')
        return
      }

      // 로그인 성공
      if (signInData.user) {
        setAutoLoggedIn(true)
        
        // 프로필 완성도 확인
        const { data: profile } = await supabase
          .from(invitation.role === 'organization' ? 'organization_profiles' : 'expert_profiles')
          .select('is_profile_complete')
          .eq('user_id', signInData.user.id)
          .single()

        if (profile?.is_profile_complete) {
          // 프로필이 완성되어 있으면 대시보드로
          toast.success('이미 로그인되어 있습니다.')
          router.push('/dashboard')
          return
        }
        // 프로필이 미완성이면 폼을 표시하여 정보 입력 받기
        toast.success('로그인되었습니다. 프로필을 완성해주세요.')
      }
    } catch (err) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Auto login error:', err)
      }
      // 자동 로그인 실패해도 계속 진행 (사용자가 수동으로 입력)
    }
  }

  const loadInvitation = async () => {
    try {
      // 토큰으로 초대 정보 조회
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        setError('유효하지 않거나 만료된 초대 링크입니다.')
        setLoading(false)
        return
      }

      // 만료 확인
      if (new Date(data.expires_at) < new Date()) {
        setError('초대 링크가 만료되었습니다. 관리자에게 문의해주세요.')
        setLoading(false)
        return
      }

      setInvitation(data)
      setUserRole(data.role)

      // 초대 정보로 폼 초기화
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        organization_name: data.organization_name || '',
        position: data.position || '',
        password: data.phone.replace(/-/g, ''), // 전화번호를 기본 비밀번호로
        confirmPassword: data.phone.replace(/-/g, '')
      })

      setLoading(false)
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('초대 정보를 불러오는 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // 비밀번호 확인
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        setSubmitting(false)
        return
      }

      // 최소 비밀번호 길이 확인
      if (formData.password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.')
        setSubmitting(false)
        return
      }

      // 1. 이미 로그인되어 있는지 확인
      const { data: { session } } = await supabase.auth.getSession()
      let signInData = session ? { user: session.user } : null

      // 로그인되어 있지 않으면 로그인 시도
      if (!signInData) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: invitation.phone.replace(/-/g, '')
        })

        if (signInResult.error || !signInResult.data.user) {
          throw new Error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
        }

        signInData = signInResult.data
      }

      // 2. 비밀번호 변경 (선택사항 - 사용자가 변경한 경우)
      if (formData.password !== invitation.phone.replace(/-/g, '')) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.password
        })

        if (updateError) {
          console.error('Error updating password:', updateError)
          // 비밀번호 변경 실패해도 계속 진행
        }
      }

      // 3. 프로필 정보 업데이트 (어드민이 입력한 정보 사용)
      if (userRole === 'organization') {
        const { error: orgError } = await supabase
          .from('organization_profiles')
          .update({
            organization_name: invitation.organization_name || invitation.name,
            representative_name: invitation.name,
            contact_position: invitation.position || null
          })
          .eq('user_id', signInData.user.id)

        if (orgError) {
          // 개발 모드에서만 로그
          if (process.env.NODE_ENV === 'development') {
            console.error('Error updating organization profile:', orgError)
          }
        }
      } else {
        const { error: expertError } = await supabase
          .from('expert_profiles')
          .update({
            name: invitation.name
          })
          .eq('user_id', signInData.user.id)

        if (expertError) {
          // 개발 모드에서만 로그
          if (process.env.NODE_ENV === 'development') {
            console.error('Error updating expert profile:', expertError)
          }
        }
      }

      // 4. users 테이블 업데이트
      await supabase
        .from('users')
        .update({
          phone: invitation.phone
        })
        .eq('id', signInData.user.id)

      // 5. 초대 상태 업데이트
      await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('token', token)

      toast.success('프로필이 완성되었습니다!')

      // 6. 프로필 완성도 업데이트
      if (userRole === 'organization') {
        await supabase
          .from('organization_profiles')
          .update({ is_profile_complete: true })
          .eq('user_id', signInData.user.id)
        
        router.push('/dashboard')
      } else {
        await supabase
          .from('expert_profiles')
          .update({ is_profile_complete: true })
          .eq('user_id', signInData.user.id)
        
        router.push('/dashboard')
      }

    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      setError(err.message || '프로필 완성 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-600">초대 정보를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              오류 발생
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            프로필 완성하기
          </CardTitle>
          <CardDescription className="text-center">
            {invitation?.organization_name ? (
              <>
                <strong>{invitation.organization_name}</strong>에서 초대해주셨습니다.
              </>
            ) : (
              '초대가 도착했습니다. 프로필을 완성해주세요.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {autoLoggedIn ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <strong>자동 로그인되었습니다!</strong> 프로필 정보를 입력해주세요.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>로그인 정보:</strong><br />
                  이메일: {invitation?.email}<br />
                  초기 비밀번호: {invitation?.phone} (전화번호)
                </p>
              </div>
            )}

            {/* 읽기 전용 정보 표시 (어드민이 입력한 정보) */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
              <div>
                <Label className="text-xs text-gray-500">이름</Label>
                <p className="text-sm font-medium mt-1">{invitation?.name || formData.name}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">전화번호</Label>
                <p className="text-sm font-medium mt-1">{invitation?.phone || formData.phone}</p>
              </div>
              {userRole === 'organization' && (
                <>
                  <div>
                    <Label className="text-xs text-gray-500">조직명</Label>
                    <p className="text-sm font-medium mt-1">{invitation?.organization_name || formData.organization_name}</p>
                  </div>
                  {invitation?.position && (
                    <div>
                      <Label className="text-xs text-gray-500">직책</Label>
                      <p className="text-sm font-medium mt-1">{invitation.position}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <Label className="text-xs text-gray-500">이메일</Label>
                <p className="text-sm font-medium mt-1">{invitation?.email}</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 text-center">
              💡 위 정보가 정확한지 확인해주세요. 수정이 필요하면 관리자에게 문의해주세요.
            </div>

            {/* 비밀번호 변경 옵션 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={formData.password !== invitation?.phone.replace(/-/g, '')}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setFormData({
                        ...formData,
                        password: invitation?.phone.replace(/-/g, '') || '',
                        confirmPassword: invitation?.phone.replace(/-/g, '') || ''
                      })
                    }
                  }}
                  className="w-4 h-4 min-w-[44px] min-h-[44px]"
                />
                <Label htmlFor="changePassword" className="text-sm font-normal cursor-pointer">
                  비밀번호 변경하기
                </Label>
              </div>

              {formData.password !== invitation?.phone.replace(/-/g, '') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      새 비밀번호 <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="최소 6자 이상"
                      className="min-h-[44px]"
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      비밀번호 확인 <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="min-h-[44px]"
                      disabled={submitting}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={submitting}
              isLoading={submitting}
            >
              {submitting ? '처리 중...' : '프로필 완성하기'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <p className="text-gray-600">
              이미 계정이 있으신가요?{' '}
              <a href="/auth/login" className="text-blue-600 hover:underline">
                로그인
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

