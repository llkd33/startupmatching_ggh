'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MultiStepWizard } from '@/components/ui/multi-step-wizard'
import { useToast } from '@/components/ui/toast-provider'
import { QuickProfileStep } from '@/components/expert/QuickProfileStep'
import { DetailedProfileStep } from '@/components/expert/DetailedProfileStep'

interface QuickProfileData {
  name: string
  phone: string
  bio: string
  skills: string[]
}

interface DetailedProfileData {
  career: Array<{
    company: string
    position: string
    start_date: string
    end_date: string
    description: string
  }>
  education: Array<{
    school: string
    major: string
    degree: string
    status: '졸업' | '졸업예정' | '재학' | '휴학' | '중퇴'
    graduation_year: string
  }>
  portfolio: string
  introduction: string
}

interface ExpertProfileResponse {
  user: {
    id: string
    email: string
    role: string
    phone: string | null
  }
  profile: {
    id: string
    user_id: string
    name?: string | null
    bio?: string | null
    career_history?: DetailedProfileData['career'] | null
    education?: DetailedProfileData['education'] | null
    skills?: string[] | null
    hashtags?: string[] | null
    portfolio_url?: string | null
    is_profile_complete?: boolean | null
  }
  fallbackName?: string
}

export default function SimplifiedExpertProfilePage() {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [expertId, setExpertId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [savedStep, setSavedStep] = useState(0)
  
  const [quickProfileData, setQuickProfileData] = useState<QuickProfileData>({
    name: '',
    phone: '',
    bio: '',
    skills: []
  })

  const [detailedProfileData, setDetailedProfileData] = useState<DetailedProfileData>({
    career: [],
    education: [],
    portfolio: '',
    introduction: ''
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  const requestExpertProfile = async (
    method: 'GET' | 'PATCH',
    body?: Record<string, unknown>
  ): Promise<ExpertProfileResponse> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      throw new Error('로그인이 필요합니다.')
    }

    const response = await fetch('/api/profile/expert', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 401) {
      router.push('/auth/login')
      throw new Error('로그인이 필요합니다.')
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      throw new Error(errorBody?.error || '전문가 프로필을 불러오지 못했습니다.')
    }

    return response.json()
  }

  const checkAuthAndLoadProfile = async () => {
    try {
      const { user, profile, fallbackName } = await requestExpertProfile('GET')

      if (profile?.is_profile_complete) {
        router.push('/dashboard')
        return
      }

      setExpertId(profile?.id || null)
      setUserId(user.id)
    
      // Load existing profile data if available
      if (profile) {
        const skills = profile.skills?.length ? profile.skills : profile.hashtags || []

        setQuickProfileData({
          name: profile.name || fallbackName || user.email?.split('@')[0] || '',
          phone: user.phone || '',
          bio: profile.bio || '',
          skills: skills.slice(0, 3)
        })

        setDetailedProfileData({
          career: profile.career_history || [],
          education: profile.education || [],
          portfolio: profile.portfolio_url || '',
          introduction: profile.bio || ''
        })
      
        // Load saved step from localStorage
        const saved = localStorage.getItem(`expert-profile-step-${user.id}`)
        if (saved) {
          setSavedStep(parseInt(saved))
        }
      }
    } catch (error: any) {
      showError(error.message || '프로필을 불러오는 중 오류가 발생했습니다.')
    }
  }

  const updateQuickProfile = (field: string, value: string | string[]) => {
    setQuickProfileData(prev => ({ ...prev, [field]: value }))
  }

  const updateDetailedProfile = (field: string, value: any) => {
    setDetailedProfileData(prev => ({ ...prev, [field]: value }))
  }

  const saveProgress = async (currentStep: number) => {
    if (!expertId) return
    
    if (userId) {
      localStorage.setItem(`expert-profile-step-${userId}`, currentStep.toString())
    }
    
    try {
      await requestExpertProfile('PATCH', {
        name: quickProfileData.name,
        phone: quickProfileData.phone,
        bio: quickProfileData.bio,
        skills: quickProfileData.skills,
        career: detailedProfileData.career,
        education: detailedProfileData.education,
        portfolio: detailedProfileData.portfolio,
        introduction: detailedProfileData.introduction,
        complete: false
      })
      success('진행상황이 저장되었습니다.')
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save progress:', error)
      }
    }
  }

  const completeProfile = async (skipDetails = false) => {
    if (!expertId) {
      showError('전문가 프로필을 찾을 수 없습니다.')
      return
    }

    setLoading(true)

    try {
      const profilePayload: Record<string, unknown> = {
        name: quickProfileData.name,
        phone: quickProfileData.phone,
        bio: quickProfileData.bio,
        skills: quickProfileData.skills,
        career: [],
        education: [],
        portfolio: '',
        introduction: '',
        complete: true
      }

      // 상세 정보 추가 (있는 경우)
      if (!skipDetails) {
        profilePayload.career = detailedProfileData.career
        profilePayload.education = detailedProfileData.education
        profilePayload.portfolio = detailedProfileData.portfolio
        profilePayload.introduction = detailedProfileData.introduction
      }

      await requestExpertProfile('PATCH', profilePayload)

      // Generate auto hashtags (optional - can be done later)
      // 해시태그는 자동 생성되거나 수동으로 추가 가능

      // Clear saved step
      if (userId) {
        localStorage.removeItem(`expert-profile-step-${userId}`)
      }

      success(skipDetails 
        ? '프로필이 저장되었습니다! 나중에 상세 정보를 추가할 수 있습니다.'
        : '프로필이 성공적으로 완성되었습니다!'
      )
      router.push('/dashboard')
    } catch (error: any) {
      showError(`프로필 업데이트 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const validateQuickProfile = () => {
    const errors: Record<string, string> = {}
    
    if (!quickProfileData.name || quickProfileData.name.length < 2) {
      errors.name = '이름을 입력해주세요 (최소 2자)'
    }
    
    if (!quickProfileData.phone || !/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/.test(quickProfileData.phone)) {
      errors.phone = '올바른 전화번호를 입력해주세요 (예: 010-1234-5678)'
    }
    
    if (!quickProfileData.bio || quickProfileData.bio.length < 10) {
      errors.bio = '간단한 자기소개를 입력해주세요 (최소 10자)'
    }
    
    if (quickProfileData.skills.length === 0) {
      errors.skills = '최소 1개의 스킬을 선택해주세요'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const wizardSteps = [
    {
      id: 'quick-profile',
      title: '필수 정보',
      description: '필수 정보만 입력하면 바로 시작할 수 있습니다 (약 2분)',
      component: (
        <QuickProfileStep
          data={quickProfileData}
          onChange={updateQuickProfile}
          errors={validationErrors}
        />
      ),
      validation: validateQuickProfile
    },
    {
      id: 'detailed-profile',
      title: '상세 정보',
      description: '상세 정보를 입력하면 더 많은 기회를 받을 수 있습니다 (선택사항)',
      component: (
        <DetailedProfileStep
          data={detailedProfileData}
          onChange={updateDetailedProfile}
        />
      ),
      validation: () => true // 선택 사항이므로 항상 통과
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">전문가 프로필 완성하기</CardTitle>
            <CardDescription>
              Step 1: 필수 정보만 입력하면 바로 시작할 수 있습니다. Step 2는 선택사항입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiStepWizard
              steps={wizardSteps}
              onComplete={() => completeProfile(false)}
              onSaveProgress={saveProgress}
              onSkip={(step) => {
                if (step === 1) {
                  // Step 2 (상세 정보) 건너뛰기
                  completeProfile(true)
                }
              }}
              initialStep={savedStep}
              showProgressBar={true}
              allowNavigation={true}
              allowSkip={true}
            />
            
            <div className="mt-6 pt-6 border-t flex justify-center">
              <Button 
                variant="ghost"
                onClick={() => {
                  // 필수 정보만 저장하고 대시보드로 이동
                  if (validateQuickProfile()) {
                    completeProfile(true)
                  }
                }}
                isLoading={loading}
                className="min-h-[44px]"
              >
                필수 정보만 저장하고 나중에 완성하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
