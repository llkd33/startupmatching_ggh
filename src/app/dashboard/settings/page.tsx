'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Bell,
  Shield,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/components/ui/toast-custom'

const MIN_PASSWORD_LENGTH = 8

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !currentUser) {
        router.push('/auth/login')
        return
      }

      setUser(currentUser)

      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (userData) {
        setUserRole(userData.role)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('설정을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`)
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        throw error
      }

      toast.success('비밀번호가 성공적으로 변경되었습니다.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 변경 중 오류가 발생했습니다.'
      toast.error(message)
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">설정</h1>
        <p className="text-gray-600">계정 및 앱 설정을 관리하세요</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            프로필
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            알림
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            보안
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프로필 설정</CardTitle>
              <CardDescription>계정 정보를 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">이메일</label>
                <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
              </div>

              <div className="pt-4 border-t">
                <Button asChild>
                  <Link href={userRole === 'expert' ? '/profile/expert/edit' : '/profile/organization/edit'}>
                    프로필 수정하기
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>받고 싶은 알림을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/settings/notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  알림 설정 관리
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>{MIN_PASSWORD_LENGTH}자 이상의 새 비밀번호를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 확인"
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      변경 중...
                    </>
                  ) : (
                    '비밀번호 변경'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
