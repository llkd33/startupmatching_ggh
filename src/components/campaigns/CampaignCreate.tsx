'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { db } from '@/lib/supabase'

export default function CampaignCreate() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const [formData, setFormData] = useState({
    type: 'mentoring' as 'mentoring' | 'investment' | 'service',
    title: '',
    description: '',
    category: '',
    keywords: [] as string[],
    budgetMin: '',
    budgetMax: '',
    startDate: '',
    endDate: '',
    location: '',
    requiredExperts: 1,
    attachments: [] as any[],
    externalLinks: [] as string[],
    // Type-specific fields
    mentoringDetails: {
      topic: '',
      targetAudience: '',
      duration: '',
      format: 'offline' as 'online' | 'offline' | 'hybrid',
    },
    investmentDetails: {
      companyStage: '',
      fundingAmount: '',
      industry: '',
      previousFunding: '',
    },
    serviceDetails: {
      serviceType: '',
      deliverables: '',
      timeline: '',
    },
  })

  const categories = [
    '기술/IT',
    '마케팅',
    '경영/전략', 
    '투자/금융',
    '법률/특허',
    '디자인',
    '인사/조직',
    '영업/판매',
    '글로벌',
    '제조/생산'
  ]

  const suggestedKeywords = {
    mentoring: ['멘토링', '강의', '교육', '워크샵', '세미나', '컨설팅'],
    investment: ['시리즈A', '시리즈B', 'Pre-A', '시드투자', '엔젤투자', 'VC'],
    service: ['개발', '디자인', '마케팅', '홍보', '번역', '컨설팅', '용역']
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get organization profile
      const { data: profile } = await db.users.getProfile(user.id)
      
      if (!profile?.organization_profiles?.[0]?.id) {
        alert('기관 프로필을 먼저 완성해주세요.')
        router.push('/organization/profile')
        return
      }

      const campaignData = {
        organization_id: profile.organization_profiles[0].id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        keywords: formData.keywords,
        budget_min: formData.budgetMin ? parseFloat(formData.budgetMin) : null,
        budget_max: formData.budgetMax ? parseFloat(formData.budgetMax) : null,
        start_date: formData.startDate,
        end_date: formData.endDate,
        location: formData.location,
        required_experts: formData.requiredExperts,
        status: 'active',
        campaign_data: {
          attachments: formData.attachments,
          externalLinks: formData.externalLinks,
          ...(formData.type === 'mentoring' && { mentoringDetails: formData.mentoringDetails }),
          ...(formData.type === 'investment' && { investmentDetails: formData.investmentDetails }),
          ...(formData.type === 'service' && { serviceDetails: formData.serviceDetails }),
        }
      }

      const { data: campaign, error } = await db.campaigns.create(campaignData)
      
      if (error) {
        console.error('Campaign creation error:', error)
        alert('캠페인 생성 중 오류가 발생했습니다.')
      } else {
        router.push(`/campaigns/${campaign.id}`)
      }
    } catch (error) {
      console.error('Campaign creation error:', error)
      alert('캠페인 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">캠페인 생성</h2>
            <span className="text-sm text-gray-500">
              {currentStep} / 4
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Step 1: Campaign Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                캠페인 유형 선택
              </h3>
              
              <div className="space-y-3">
                {/* Scenario 1: Mentoring/Lecture */}
                <label
                  className={`relative block rounded-lg border p-4 cursor-pointer hover:border-blue-500 ${
                    formData.type === 'mentoring' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="campaignType"
                    value="mentoring"
                    className="sr-only"
                    checked={formData.type === 'mentoring'}
                    onChange={(e) => setFormData({ ...formData, type: 'mentoring' })}
                  />
                  <div className="flex items-start">
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        강의/멘토링 요청
                      </span>
                      <span className="mt-1 text-sm text-gray-500">
                        전문가의 강의나 멘토링이 필요한 경우
                      </span>
                      <div className="mt-2 text-xs text-gray-400">
                        예: "조달 영업 관련 전문가를 찾고 있어요"
                      </div>
                    </div>
                    {formData.type === 'mentoring' && (
                      <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </label>

                {/* Scenario 2: Investment Matching */}
                <label
                  className={`relative block rounded-lg border p-4 cursor-pointer hover:border-blue-500 ${
                    formData.type === 'investment' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="campaignType"
                    value="investment"
                    className="sr-only"
                    checked={formData.type === 'investment'}
                    onChange={(e) => setFormData({ ...formData, type: 'investment' })}
                  />
                  <div className="flex items-start">
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        투자자 매칭
                      </span>
                      <span className="mt-1 text-sm text-gray-500">
                        스타트업과 투자자를 연결하고 싶은 경우
                      </span>
                      <div className="mt-2 text-xs text-gray-400">
                        예: "보육중인 10개 기업의 투자자 매칭 요청"
                      </div>
                    </div>
                    {formData.type === 'investment' && (
                      <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </label>

                {/* Scenario 3: Service Outsourcing */}
                <label
                  className={`relative block rounded-lg border p-4 cursor-pointer hover:border-blue-500 ${
                    formData.type === 'service' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="campaignType"
                    value="service"
                    className="sr-only"
                    checked={formData.type === 'service'}
                    onChange={(e) => setFormData({ ...formData, type: 'service' })}
                  />
                  <div className="flex items-start">
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        용역/업무 대행
                      </span>
                      <span className="mt-1 text-sm text-gray-500">
                        특정 서비스나 업무를 대행할 업체가 필요한 경우
                      </span>
                      <div className="mt-2 text-xs text-gray-400">
                        예: "케이터링 및 영상 촬영 가능한 업체 찾아요"
                      </div>
                    </div>
                    {formData.type === 'service' && (
                      <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                기본 정보
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  캠페인 제목 *
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    formData.type === 'mentoring' ? "예: 조달 영업 전문가 강의 요청" :
                    formData.type === 'investment' ? "예: 시리즈A 단계 스타트업 투자자 매칭" :
                    "예: 창업보육센터 행사 케이터링 업체 모집"
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  상세 설명 *
                </label>
                <textarea
                  required
                  rows={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="캠페인의 목적과 요구사항을 상세히 설명해주세요"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    카테고리 *
                  </label>
                  <select
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">선택하세요</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    필요 전문가 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.requiredExperts}
                    onChange={(e) => setFormData({ ...formData, requiredExperts: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  키워드 (클릭하여 선택)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestedKeywords[formData.type].map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => {
                        if (formData.keywords.includes(keyword)) {
                          setFormData({
                            ...formData,
                            keywords: formData.keywords.filter(k => k !== keyword)
                          })
                        } else {
                          setFormData({
                            ...formData,
                            keywords: [...formData.keywords, keyword]
                          })
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.keywords.includes(keyword)
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="추가 키워드 입력 (Enter로 추가)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = (e.target as HTMLInputElement).value.trim()
                      if (value && !formData.keywords.includes(value)) {
                        setFormData({
                          ...formData,
                          keywords: [...formData.keywords, value]
                        })
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                상세 정보
              </h3>
              
              {/* Budget */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    최소 예산
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      className="block w-full pl-3 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      value={formData.budgetMin}
                      onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">원</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    최대 예산
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      className="block w-full pl-3 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      value={formData.budgetMax}
                      onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    시작일
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    종료일
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  지역
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 서울, 경기, 부산"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* Type-specific fields */}
              {formData.type === 'mentoring' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      강의/멘토링 형식
                    </label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.mentoringDetails.format}
                      onChange={(e) => setFormData({
                        ...formData,
                        mentoringDetails: { ...formData.mentoringDetails, format: e.target.value as any }
                      })}
                    >
                      <option value="offline">오프라인</option>
                      <option value="online">온라인</option>
                      <option value="hybrid">하이브리드</option>
                    </select>
                  </div>
                </>
              )}

              {formData.type === 'investment' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      투자 단계
                    </label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.investmentDetails.companyStage}
                      onChange={(e) => setFormData({
                        ...formData,
                        investmentDetails: { ...formData.investmentDetails, companyStage: e.target.value }
                      })}
                    >
                      <option value="">선택하세요</option>
                      <option value="pre-seed">Pre-Seed</option>
                      <option value="seed">Seed</option>
                      <option value="series-a">Series A</option>
                      <option value="series-b">Series B</option>
                      <option value="series-c">Series C+</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Attachments */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                첨부 파일 및 링크
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  외부 링크 (구글 드라이브, 드롭박스 등)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  사업계획서나 관련 자료를 외부 링크로 공유할 수 있습니다.
                </p>
                {formData.externalLinks.map((link, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="url"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://drive.google.com/..."
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...formData.externalLinks]
                        newLinks[index] = e.target.value
                        setFormData({ ...formData, externalLinks: newLinks })
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newLinks = formData.externalLinks.filter((_, i) => i !== index)
                        setFormData({ ...formData, externalLinks: newLinks })
                      }}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      externalLinks: [...formData.externalLinks, '']
                    })
                  }}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  + 링크 추가
                </button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  캠페인 요약
                </h4>
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">유형:</dt>
                    <dd className="font-medium">
                      {formData.type === 'mentoring' && '강의/멘토링'}
                      {formData.type === 'investment' && '투자자 매칭'}
                      {formData.type === 'service' && '용역/업무 대행'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">제목:</dt>
                    <dd className="font-medium">{formData.title || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">카테고리:</dt>
                    <dd className="font-medium">{formData.category || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">키워드:</dt>
                    <dd className="font-medium">{formData.keywords.join(', ') || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">예산:</dt>
                    <dd className="font-medium">
                      {formData.budgetMin && formData.budgetMax
                        ? `${parseInt(formData.budgetMin).toLocaleString()}원 ~ ${parseInt(formData.budgetMax).toLocaleString()}원`
                        : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '생성 중...' : '캠페인 생성'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}