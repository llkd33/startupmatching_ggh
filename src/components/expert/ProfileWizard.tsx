'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { db } from '@/lib/supabase'
import ResumeParser from './ResumeParser'

interface CareerItem {
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
}

interface EducationItem {
  school: string
  major: string
  degree: string
  graduationYear: string
}

export default function ProfileWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    career: [] as CareerItem[],
    education: [] as EducationItem[],
    skills: [] as string[],
    serviceRegions: [] as string[],
    portfolioUrl: '',
    bio: '',
    hourlyRate: '',
  })

  const totalSteps = 5

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleResumeParseComplete = (parsedData: any) => {
    setFormData({
      ...formData,
      ...parsedData,
    })
    handleNext()
  }

  const handleSubmit = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get expert profile ID
      const { data: profile } = await db.experts.getProfile(user.id)
      
      if (profile?.expert_profiles?.[0]?.id) {
        // Update expert profile
        await db.experts.updateProfile(profile.expert_profiles[0].id, {
          name: formData.name,
          career_history: formData.career,
          education: formData.education,
          skills: formData.skills,
          service_regions: formData.serviceRegions,
          portfolio_url: formData.portfolioUrl,
          bio: formData.bio,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        })

        // Auto-generate hashtags
        await db.experts.updateHashtags(profile.expert_profiles[0].id)
        
        router.push('/expert/dashboard')
      }
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setLoading(false)
    }
  }

  const regions = [
    '전국', '서울', '경기', '인천', '부산', '대구', '광주', 
    '대전', '울산', '세종', '강원', '충북', '충남', 
    '전북', '전남', '경북', '경남', '제주'
  ]

  const commonSkills = [
    '창업컨설팅', '사업계획서', '투자유치', '마케팅', '영업',
    '재무/회계', '법률자문', '특허/지식재산', 'IT개발', '디자인',
    '브랜딩', '홍보/PR', '인사/조직', '해외진출', '정부지원사업'
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">전문가 프로필 설정</h2>
            <span className="text-sm text-gray-500">
              {currentStep} / {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Step 1: Resume Import */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  이력서 불러오기 (선택사항)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  기존 이력서를 복사-붙여넣기하면 자동으로 정보를 추출합니다.
                </p>
                <ResumeParser onParseComplete={handleResumeParseComplete} />
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    건너뛰고 직접 입력하기 →
                  </button>
                </div>
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
                  이름 *
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  전화번호
                </label>
                <input
                  type="tel"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="010-0000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  자기소개
                </label>
                <textarea
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="전문 분야와 경험을 간단히 소개해주세요"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  시간당 컨설팅 비용 (선택)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    className="block w-full pl-3 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100000"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">원/시간</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Career & Education */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                경력 및 학력
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  경력사항
                </label>
                {formData.career.map((item, index) => (
                  <div key={index} className="mb-3 p-3 border border-gray-200 rounded">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.company}</p>
                        <p className="text-sm text-gray-600">{item.position}</p>
                        <p className="text-xs text-gray-500">
                          {item.startDate} ~ {item.endDate || '재직중'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newCareer = [...formData.career]
                          newCareer.splice(index, 1)
                          setFormData({ ...formData, career: newCareer })
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      career: [...formData.career, {
                        company: '',
                        position: '',
                        startDate: '',
                        endDate: '',
                        description: ''
                      }]
                    })
                  }}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  + 경력 추가
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  학력사항
                </label>
                {formData.education.map((item, index) => (
                  <div key={index} className="mb-3 p-3 border border-gray-200 rounded">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.school}</p>
                        <p className="text-sm text-gray-600">{item.major} ({item.degree})</p>
                        <p className="text-xs text-gray-500">졸업: {item.graduationYear}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newEducation = [...formData.education]
                          newEducation.splice(index, 1)
                          setFormData({ ...formData, education: newEducation })
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      education: [...formData.education, {
                        school: '',
                        major: '',
                        degree: '학사',
                        graduationYear: ''
                      }]
                    })
                  }}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  + 학력 추가
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Skills & Keywords */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                전문 분야 및 스킬
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전문 분야 선택 (복수 선택 가능)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {commonSkills.map((skill) => (
                    <label key={skill} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.skills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              skills: [...formData.skills, skill]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              skills: formData.skills.filter(s => s !== skill)
                            })
                          }
                        }}
                      />
                      <span className="text-sm">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  추가 키워드 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 스타트업, B2B영업, 시리즈A"
                  onBlur={(e) => {
                    const additionalSkills = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    setFormData({
                      ...formData,
                      skills: [...new Set([...formData.skills, ...additionalSkills])]
                    })
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  포트폴리오 URL (선택)
                </label>
                <input
                  type="url"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 5: Service Regions */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                서비스 제공 지역
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  활동 가능 지역 선택 (복수 선택 가능)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {regions.map((region) => (
                    <label key={region} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.serviceRegions.includes(region)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // If selecting "전국", clear other selections
                            if (region === '전국') {
                              setFormData({
                                ...formData,
                                serviceRegions: ['전국']
                              })
                            } else {
                              // Remove "전국" if selecting specific region
                              const newRegions = formData.serviceRegions.filter(r => r !== '전국')
                              setFormData({
                                ...formData,
                                serviceRegions: [...newRegions, region]
                              })
                            }
                          } else {
                            setFormData({
                              ...formData,
                              serviceRegions: formData.serviceRegions.filter(r => r !== region)
                            })
                          }
                        }}
                      />
                      <span className="text-sm">{region}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  프로필 미리보기
                </h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>이름:</strong> {formData.name}</p>
                  <p><strong>전문분야:</strong> {formData.skills.slice(0, 5).join(', ')}</p>
                  <p><strong>활동지역:</strong> {formData.serviceRegions.join(', ')}</p>
                  <p className="text-xs mt-2 text-blue-600">
                    * 경력과 학력 정보를 바탕으로 추가 키워드가 자동 생성됩니다.
                  </p>
                </div>
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
            
            {currentStep < totalSteps ? (
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
                {loading ? '저장 중...' : '프로필 완성'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}