'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase'
import { UserRole } from '@/types/supabase'

interface AuthFormProps {
  mode: 'login' | 'signup'
  defaultRole?: UserRole
}

export default function AuthForm({ mode, defaultRole = 'expert' }: AuthFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: defaultRole as 'expert' | 'organization',
    fullName: '',
    phoneNumber: '',
    organizationName: '',
    businessRegistrationNumber: '',
    contactPersonName: '',
    contactPersonPosition: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const metadata = {
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          ...(formData.role === 'organization' && {
            organization_name: formData.organizationName,
            business_registration_number: formData.businessRegistrationNumber,
            contact_person_name: formData.contactPersonName,
            contact_person_position: formData.contactPersonPosition,
          }),
        }

        const { error } = await auth.signUp(
          formData.email,
          formData.password,
          formData.role,
          metadata
        )

        if (error) throw error

        // Redirect to email confirmation page
        router.push('/auth/confirm-email')
      } else {
        const { error } = await auth.signIn(formData.email, formData.password)
        
        if (error) throw error

        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      {mode === 'signup' && (
        <>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              사용자 유형
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="expert">전문가</option>
              <option value="organization">창업지원기관</option>
            </select>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              {formData.role === 'expert' ? '이름' : '담당자명'}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              전화번호
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="010-0000-0000"
            />
          </div>

          {formData.role === 'organization' && (
            <>
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  기관명
                </label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700">
                  사업자등록번호
                </label>
                <input
                  id="businessRegistrationNumber"
                  name="businessRegistrationNumber"
                  type="text"
                  value={formData.businessRegistrationNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="000-00-00000"
                />
              </div>

              <div>
                <label htmlFor="contactPersonPosition" className="block text-sm font-medium text-gray-700">
                  담당자 직책
                </label>
                <input
                  id="contactPersonPosition"
                  name="contactPersonPosition"
                  type="text"
                  value={formData.contactPersonPosition}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </>
          )}
        </>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              계정이 없으신가요?{' '}
              <a href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                회원가입
              </a>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <a href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                로그인
              </a>
            </>
          )}
        </p>
      </div>
    </form>
  )
}