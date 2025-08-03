'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserIcon, BuildingIcon } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">회원가입</h1>
          <p className="mt-2 text-gray-600">
            계정 유형을 선택해주세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Expert Registration Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => router.push('/auth/register/expert')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">전문가로 가입</CardTitle>
              <CardDescription>
                전문 지식과 경험을 공유하고 프로젝트에 참여하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  경력 및 포트폴리오 등록
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  프로젝트 제안서 제출
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  멘토링 및 컨설팅 제공
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  전문 분야 해시태그 자동 생성
                </li>
              </ul>
              <Button className="w-full mt-6">
                전문가로 시작하기
              </Button>
            </CardContent>
          </Card>

          {/* Organization Registration Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push('/auth/register/organization')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <BuildingIcon className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">조직으로 가입</CardTitle>
              <CardDescription>
                전문가를 찾고 프로젝트를 함께 진행하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  캠페인 생성 및 관리
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  전문가 검색 및 매칭
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  제안서 검토 및 선택
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  프로젝트 진행 관리
                </li>
              </ul>
              <Button className="w-full mt-6" variant="secondary">
                조직으로 시작하기
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <span className="text-gray-600">이미 계정이 있으신가요? </span>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}