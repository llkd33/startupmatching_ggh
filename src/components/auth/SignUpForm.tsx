'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import Link from 'next/link'
import { UserRole } from '@/types/supabase'
import { useFormValidation } from '@/hooks/useFormValidation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

export default function SignUpForm() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<'expert' | 'organization'>('expert')
  
  // Form validation
  const {
    values: formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAllFields,
    setValue
  } = useFormValidation(
    {
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      name: '',
      organizationName: '',
      representativeName: '',
      businessNumber: '',
      contactPosition: '',
    },
    {
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      confirmPassword: { 
        required: true,
        custom: async (value, allValues) => {
          if (value && allValues && allValues.password && value !== allValues.password) {
            return '비밀번호가 일치하지 않습니다.'
          }
          return null
        }
      },
      phone: { phone: true },
      name: { required: true, minLength: 2 },
      organizationName: { required: true, minLength: 2 },
      representativeName: { required: true, minLength: 2 },
    },
    { mode: 'onBlur', reValidateMode: 'onChange' }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate all fields
    const isValid = await validateAllFields()
    if (!isValid) {
      setError('입력 정보를 확인해주세요.')
      setLoading(false)
      return
    }

    try {
      const metadata = {
        phone: formData.phone || undefined,
        ...(role === 'expert' 
          ? { 
              name: formData.name 
            }
          : {
              organization_name: formData.organizationName,
              representative_name: formData.representativeName,
              business_number: formData.businessNumber || undefined,
              contact_position: formData.contactPosition || undefined,
            }
        ),
      }

      const { error } = await signUp(
        formData.email,
        formData.password,
        role,
        metadata
      )
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.')
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
                  회원가입이 완료되었습니다!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    이메일로 전송된 확인 링크를 클릭하여 계정을 활성화해주세요.
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-green-600 hover:text-green-500"
                  >
                    로그인 페이지로 이동 →
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
            새 계정 만들기
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              로그인
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가입 유형 선택
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('expert')}
                className={`relative rounded-lg border p-4 flex flex-col items-center cursor-pointer focus:outline-none min-h-[44px] ${
                  role === 'expert'
                    ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
                aria-label="전문가로 가입"
              >
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium">전문가</span>
                <span className="text-xs text-gray-500 mt-1">컨설턴트, 멘토, 강사</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('organization')}
                className={`relative rounded-lg border p-4 flex flex-col items-center cursor-pointer focus:outline-none min-h-[44px] ${
                  role === 'organization'
                    ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
                aria-label="기관으로 가입"
              >
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm font-medium">기관</span>
                <span className="text-xs text-gray-500 mt-1">창업지원기관, 기업</span>
              </button>
            </div>
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
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
                <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className={`mt-1 h-12 text-base pr-12 ${touched.password && errors.password ? 'border-red-500' : ''}`}
                  placeholder="최소 6자 이상"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={touched.password && !!errors.password}
                  aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p id="password-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className={`mt-1 h-12 text-base pr-12 ${touched.confirmPassword && errors.confirmPassword ? 'border-red-500' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-500' : ''}`}
                  placeholder="비밀번호 재입력"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                  aria-describedby={touched.confirmPassword && errors.confirmPassword ? 'confirmPassword-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && (
                <p className="text-green-600 text-sm mt-1">✓ 비밀번호가 일치합니다</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                전화번호
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className={`mt-1 h-12 text-base ${touched.phone && errors.phone ? 'border-red-500' : ''}`}
                placeholder="010-0000-0000"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                aria-invalid={touched.phone && !!errors.phone}
                aria-describedby={touched.phone && errors.phone ? 'phone-error' : undefined}
              />
              {touched.phone && errors.phone && (
                <p id="phone-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Expert-specific Fields */}
            {role === 'expert' && (
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className={`mt-1 h-12 text-base ${touched.name && errors.name ? 'border-red-500' : ''}`}
                  placeholder="실명을 입력해주세요"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  aria-invalid={touched.name && !!errors.name}
                  aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                />
                {touched.name && errors.name && (
                  <p id="name-error" className="text-red-600 text-sm mt-1" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
            )}

            {/* Organization-specific Fields */}
            {role === 'organization' && (
              <>
                <div>
                  <Label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    기관명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    className={`mt-1 h-12 text-base ${touched.organizationName && errors.organizationName ? 'border-red-500' : ''}`}
                    placeholder="기관명을 입력해주세요"
                    value={formData.organizationName}
                    onChange={(e) => handleChange('organizationName', e.target.value)}
                    onBlur={() => handleBlur('organizationName')}
                    aria-invalid={touched.organizationName && !!errors.organizationName}
                    aria-describedby={touched.organizationName && errors.organizationName ? 'organizationName-error' : undefined}
                  />
                  {touched.organizationName && errors.organizationName && (
                    <p id="organizationName-error" className="text-red-600 text-sm mt-1" role="alert">
                      {errors.organizationName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="representativeName" className="block text-sm font-medium text-gray-700">
                    담당자명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="representativeName"
                    name="representativeName"
                    type="text"
                    required
                    className={`mt-1 h-12 text-base ${touched.representativeName && errors.representativeName ? 'border-red-500' : ''}`}
                    placeholder="담당자 이름"
                    value={formData.representativeName}
                    onChange={(e) => handleChange('representativeName', e.target.value)}
                    onBlur={() => handleBlur('representativeName')}
                    aria-invalid={touched.representativeName && !!errors.representativeName}
                    aria-describedby={touched.representativeName && errors.representativeName ? 'representativeName-error' : undefined}
                  />
                  {touched.representativeName && errors.representativeName && (
                    <p id="representativeName-error" className="text-red-600 text-sm mt-1" role="alert">
                      {errors.representativeName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactPosition" className="block text-sm font-medium text-gray-700">
                    직책
                  </Label>
                  <Input
                    id="contactPosition"
                    name="contactPosition"
                    type="text"
                    className="mt-1 h-12 text-base"
                    placeholder="직책 (선택사항)"
                    value={formData.contactPosition}
                    onChange={(e) => handleChange('contactPosition', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
                    사업자등록번호
                  </Label>
                  <Input
                    id="businessNumber"
                    name="businessNumber"
                    type="text"
                    className="mt-1 h-12 text-base"
                    placeholder="000-00-00000 (선택사항)"
                    value={formData.businessNumber}
                    onChange={(e) => handleChange('businessNumber', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-medium"
              isLoading={loading}
              loadingText="가입 중..."
            >
              회원가입
            </Button>
          </div>

          <div className="text-xs text-center text-gray-500">
            회원가입 시{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              이용약관
            </Link>
            {' '}및{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </div>
        </form>
      </div>
    </div>
  )
}