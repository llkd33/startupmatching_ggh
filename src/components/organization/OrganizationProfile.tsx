'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { db } from '@/lib/supabase'

export default function OrganizationProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    organizationName: '',
    businessNumber: '',
    representativeName: '',
    contactPosition: '',
    industry: '',
    employeeCount: '',
    website: '',
    description: '',
  })

  const industries = [
    '정부/공공기관',
    '창업지원기관',
    '대학/교육기관',
    'VC/투자사',
    '대기업',
    '중견기업',
    '스타트업',
    '비영리단체',
    '기타'
  ]

  const employeeCounts = [
    '1-10명',
    '11-50명',
    '51-100명',
    '101-300명',
    '301-1000명',
    '1000명 이상'
  ]

  useEffect(() => {
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    
    try {
      const { data } = await db.users.getProfile(user.id)
      if (data?.organization_profiles?.[0]) {
        const profile = data.organization_profiles[0]
        setFormData({
          organizationName: profile.organization_name || '',
          businessNumber: profile.business_number || '',
          representativeName: profile.representative_name || '',
          contactPosition: profile.contact_position || '',
          industry: profile.industry || '',
          employeeCount: profile.employee_count || '',
          website: profile.website || '',
          description: profile.description || '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    try {
      const { data: profile } = await db.users.getProfile(user.id)
      
      if (profile?.organization_profiles?.[0]?.id) {
        await db.organizations.updateProfile(profile.organization_profiles[0].id, {
          organization_name: formData.organizationName,
          business_number: formData.businessNumber,
          representative_name: formData.representativeName,
          contact_position: formData.contactPosition,
          industry: formData.industry,
          employee_count: formData.employeeCount,
          website: formData.website,
          description: formData.description,
        })
        
        router.push('/organization/dashboard')
      }
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              기관 프로필 설정
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    기관명 *
                  </label>
                  <input
                    type="text"
                    id="organizationName"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
                    사업자등록번호
                  </label>
                  <input
                    type="text"
                    id="businessNumber"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="000-00-00000"
                    value={formData.businessNumber}
                    onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    인증을 위해 필요합니다 (선택사항)
                  </p>
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                    업종/분야 *
                  </label>
                  <select
                    id="industry"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <option value="">선택하세요</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700">
                    담당자명 *
                  </label>
                  <input
                    type="text"
                    id="representativeName"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.representativeName}
                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="contactPosition" className="block text-sm font-medium text-gray-700">
                    직책
                  </label>
                  <input
                    type="text"
                    id="contactPosition"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: 팀장, 매니저"
                    value={formData.contactPosition}
                    onChange={(e) => setFormData({ ...formData, contactPosition: e.target.value })}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700">
                    직원 수
                  </label>
                  <select
                    id="employeeCount"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  >
                    <option value="">선택하세요</option>
                    {employeeCounts.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    웹사이트
                  </label>
                  <input
                    type="url"
                    id="website"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  기관 소개
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="기관의 주요 사업과 활동을 소개해주세요"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Verification Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      기관 인증 안내
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        사업자등록번호를 입력하시면 인증 마크를 받을 수 있습니다.
                        인증된 기관은 전문가들에게 더 높은 신뢰도를 얻을 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '저장 중...' : '프로필 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}