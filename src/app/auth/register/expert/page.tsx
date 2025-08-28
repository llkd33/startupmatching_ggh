'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expertRegistrationSchema, type ExpertRegistrationInput } from '@/lib/validations/auth'
import { auth } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ExpertRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<ExpertRegistrationInput>({
    resolver: zodResolver(expertRegistrationSchema)
  })

  const onSubmit = async (data: ExpertRegistrationInput) => {
    setIsLoading(true)
    
    try {
      const { data: authData, error } = await auth.signUp(
        data.email,
        data.password,
        'expert',
        {
          name: data.name,
          phone: data.phone
        }
      )

      if (error) {
        if (error.message.includes('already registered')) {
          setError('email', {
            message: '이미 등록된 이메일입니다'
          })
        } else if (error.message.includes('email') || error.message.includes('confirm')) {
          setError('root', {
            message: '회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.'
          })
          // 이메일 확인이 필요한 경우 로그인 페이지로 이동
          setTimeout(() => router.push('/auth/login'), 3000)
          return
        } else {
          setError('root', {
            message: error.message || '회원가입 중 오류가 발생했습니다'
          })
        }
        return
      }

      // 회원가입 성공
      if (authData?.user) {
        // 세션이 있으면 바로 프로필 페이지로
        if (authData.session) {
          router.push('/profile/expert/complete')
        } else {
          // 이메일 확인이 필요한 경우
          setError('root', {
            message: '회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.'
          })
          setTimeout(() => router.push('/auth/login'), 3000)
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      setError('root', {
        message: error?.message || '회원가입 중 오류가 발생했습니다'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            전문가 회원가입
          </CardTitle>
          <CardDescription className="text-center">
            전문 지식과 경험을 공유하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="010-1234-5678"
                {...register('phone')}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 8자, 대소문자 및 숫자 포함"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  {...register('agreeToTerms')}
                  disabled={isLoading}
                />
                <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-600">
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    이용약관
                  </Link>
                  에 동의합니다
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
              )}

              <div className="flex items-start">
                <input
                  id="agreeToPrivacy"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  {...register('agreeToPrivacy')}
                  disabled={isLoading}
                />
                <label htmlFor="agreeToPrivacy" className="ml-2 text-sm text-gray-600">
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    개인정보 처리방침
                  </Link>
                  에 동의합니다
                </label>
              </div>
              {errors.agreeToPrivacy && (
                <p className="text-sm text-red-600">{errors.agreeToPrivacy.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '회원가입 중...' : '회원가입'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">이미 계정이 있으신가요? </span>
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                로그인
              </Link>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">조직 계정이 필요하신가요? </span>
              <Link href="/auth/register/organization" className="text-blue-600 hover:underline">
                조직 회원가입
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}