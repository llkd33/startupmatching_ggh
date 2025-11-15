'use client'

import { useState } from 'react'
import { useAuth } from './AuthContext'
import { useFormValidation } from '@/hooks/useFormValidation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ForgotPasswordForm() {
  const { resetPassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
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
    },
    {
      email: { required: true, email: true },
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
      const { error } = await resetPassword(formData.email)
      
      if (error) {
        toast.error(error.message)
      } else {
        setSuccess(true)
        toast.success('비밀번호 재설정 이메일을 전송했습니다.')
      }
    } catch (err: any) {
      toast.error(err.message || '비밀번호 재설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  비밀번호 재설정 이메일을 전송했습니다
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-green-600 hover:text-green-500"
                  >
                    로그인 페이지로 돌아가기 →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 재설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            가입하신 이메일 주소를 입력하세요
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일 주소 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`mt-1 h-12 text-base ${touched.email && errors.email ? 'border-red-500' : ''}`}
              placeholder="email@example.com"
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
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-medium"
              isLoading={loading}
              loadingText="전송 중..."
            >
              재설정 이메일 보내기
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← 로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}