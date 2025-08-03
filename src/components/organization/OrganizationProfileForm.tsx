'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/supabase'

interface OrganizationProfileFormProps {
  organizationId: string
  initialData?: any
}

export default function OrganizationProfileForm({ organizationId, initialData }: OrganizationProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    organization_name: initialData?.organization_name || '',
    business_registration_number: initialData?.business_registration_number || '',
    contact_person_name: initialData?.contact_person_name || '',
    contact_person_position: initialData?.contact_person_position || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await db.organizations.updateProfile(organizationId, formData)
      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const isVerified = initialData?.is_verified

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                기관 인증이 완료되었습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              기관 정보
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              창업지원기관의 기본 정보를 입력해주세요.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0 space-y-6">
            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700">
                기관명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="organization_name"
                value={formData.organization_name}
                onChange={(e) => handleChange('organization_name', e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 서울창업허브"
              />
            </div>

            <div>
              <label htmlFor="business_registration_number" className="block text-sm font-medium text-gray-700">
                사업자등록번호
              </label>
              <input
                type="text"
                id="business_registration_number"
                value={formData.business_registration_number}
                onChange={(e) => handleChange('business_registration_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="000-00-00000"
              />
              {!isVerified && formData.business_registration_number && (
                <p className="mt-2 text-sm text-yellow-600">
                  사업자등록번호 인증이 필요합니다. 관리자 검토 후 인증이 완료됩니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              담당자 정보
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              캠페인 관리 담당자의 정보를 입력해주세요.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0 space-y-6">
            <div>
              <label htmlFor="contact_person_name" className="block text-sm font-medium text-gray-700">
                담당자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="contact_person_name"
                value={formData.contact_person_name}
                onChange={(e) => handleChange('contact_person_name', e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label htmlFor="contact_person_position" className="block text-sm font-medium text-gray-700">
                담당자 직책
              </label>
              <input
                type="text"
                id="contact_person_position"
                value={formData.contact_person_position}
                onChange={(e) => handleChange('contact_person_position', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 매니저, 팀장"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading || !formData.organization_name || !formData.contact_person_name}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '저장 중...' : '프로필 저장'}
        </button>
      </div>
    </form>
  )
}