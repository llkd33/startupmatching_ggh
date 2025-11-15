'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import { useFormValidation } from '@/hooks/useFormValidation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'

export default function LoginForm() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // Form validation
  const {
    values: formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAllFields,
  } = useFormValidation(
    {
      email: '',
      password: '',
    },
    {
      email: { required: true, email: true },
      password: { required: true },
    },
    { mode: 'onBlur', reValidateMode: 'onChange' }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validate all fields
    const isValid = await validateAllFields()
    if (!isValid) {
      toast.error('입력 정보를 확인해주세요.')
      setLoading(false)
      return
    }

    try {
      const { error } = await signIn(formData.email, formData.password)
      
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('로그인되었습니다.')
        // Redirect based on user role
        const { data: { user } } = await supabase.auth.getUser()
        const role = user?.user_metadata?.role
        
        if (role === 'expert') {
          router.push('/expert/dashboard')
        } else if (role === 'organization') {
          router.push('/organization/dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      toast.error(err.message || '로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            계정에 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            또는{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              새 계정 만들기
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" value="true" />
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-address" className="sr-only">
                이메일 주소
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`h-12 text-base ${touched.email && errors.email ? 'border-red-500' : ''}`}
                placeholder="이메일 주소"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={touched.email && !!errors.email}
                aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
              />
              {touched.email && errors.email && (
                <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password" className="sr-only">
                비밀번호
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`h-12 text-base ${touched.password && errors.password ? 'border-red-500' : ''}`}
                placeholder="비밀번호"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                aria-invalid={touched.password && !!errors.password}
                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
              />
              {touched.password && errors.password && (
                <p id="password-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-medium"
              isLoading={loading}
              loadingText="로그인 중..."
            >
              로그인
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}