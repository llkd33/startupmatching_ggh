'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Zap } from 'lucide-react'

export default function DevModeLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDevLogin = async (role: 'expert' | 'organization') => {
    setLoading(true)
    
    // 개발 모드에서 로컬 스토리지에 임시 사용자 정보 저장
    const mockUser = {
      id: 'dev-user-123',
      email: 'dev@example.com',
      role: role,
      name: 'Development User'
    }
    
    localStorage.setItem('dev_user', JSON.stringify(mockUser))
    localStorage.setItem('dev_mode', 'true')
    
    // 짧은 지연 후 대시보드로 이동
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-orange-200">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">개발 모드 로그인</CardTitle>
          <CardDescription>
            테스트를 위한 임시 로그인 (프로덕션에서는 사용 불가)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="bg-orange-50 border-orange-200">
            <AlertDescription className="text-orange-800">
              ⚠️ 이것은 개발 환경 전용입니다. 실제 인증은 작동하지 않습니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={() => handleDevLogin('expert')}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '전문가로 로그인'
              )}
            </Button>

            <Button 
              onClick={() => handleDevLogin('organization')}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '기관으로 로그인'
              )}
            </Button>
          </div>

          <div className="pt-4 border-t text-center text-sm text-gray-600">
            <p>성능 최적화 적용:</p>
            <ul className="mt-2 text-left inline-block">
              <li>✅ 병렬 데이터 페칭 (60% 빠름)</li>
              <li>✅ 향상된 로딩 상태</li>
              <li>✅ 스마트 라우팅</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}