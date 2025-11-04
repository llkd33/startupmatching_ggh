'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, db } from '@/lib/supabase'
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

export default function SimplifiedExpertProfilePage() {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [expertId, setExpertId] = useState<string | null>(null)
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

  const checkAuthAndLoadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get or create expert profile
    const { data: profile, error } = await supabase
      .from('expert_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No profile found - create one
      const { data: newProfile, error: createError } = await supabase
        .from('expert_profiles')
        .insert({
          user_id: user.id,
          name: user.email?.split('@')[0] || 'Expert',
          is_profile_complete: false,
        })
        .select()
        .single()
      
      if (createError) {
        showError('프로필 생성 중 오류가 발생했습니다.')
        return
      }
      
      setExpertId(newProfile?.id || null)
      // 이름 자동 채움
      setQuickProfileData(prev => ({
        ...prev,
        name: user.email?.split('@')[0] || ''
      }))
      return
    }

    if (profile?.is_profile_complete) {
      router.push('/dashboard')
      return
    }

    setExpertId(profile?.id || null)
    
    // Load existing profile data if available
    if (profile) {
      setQuickProfileData({
        name: profile.name || user.email?.split('@')[0] || '',
        phone: profile.phone || '',
        bio: profile.introduction || profile.bio || '',
        skills: profile.hashtags?.slice(0, 3) || []
      })

      setDetailedProfileData({
        career: profile.career_history || [],
        education: profile.education || [],
        portfolio: profile.portfolio || '',
        introduction: profile.introduction || ''
      })
      
      // Load saved step from localStorage
      const saved = localStorage.getItem(`expert-profile-step-${user.id}`)
      if (saved) {
        setSavedStep(parseInt(saved))
      }
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
    
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) {
      localStorage.setItem(`expert-profile-step-${user.id}`, currentStep.toString())
    }
    
    try {
      await db.experts.updateProfile(expertId, {
        name: quickProfileData.name,
        phone: quickProfileData.phone,
        introduction: quickProfileData.bio,
        hashtags: quickProfileData.skills,
        career_history: detailedProfileData.career,
        education: detailedProfileData.education,
        portfolio: detailedProfileData.portfolio
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
      const updateData: any = {
        name: quickProfileData.name,
        phone: quickProfileData.phone,
        introduction: quickProfileData.bio,
        hashtags: quickProfileData.skills,
        is_profile_complete: skipDetails // 상세 정보를 건너뛰면 완성 처리
      }

      // 상세 정보 추가 (있는 경우)
      if (!skipDetails) {
        updateData.career_history = detailedProfileData.career
        updateData.education = detailedProfileData.education
        updateData.portfolio = detailedProfileData.portfolio
        if (detailedProfileData.introduction && detailedProfileData.introduction.length > quickProfileData.bio.length) {
          updateData.introduction = detailedProfileData.introduction
        }
        updateData.is_profile_complete = true
      }

      const { error: updateError } = await db.experts.updateProfile(expertId, updateData)

      if (updateError) {
        throw updateError
      }

      // Generate auto hashtags
      try {
        await db.experts.updateHashtags(expertId)
      } catch (hashtagError) {
        // 개발 모드에서만 로그
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to generate hashtags:', hashtagError)
        }
      }

      // Clear saved step
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (user) {
        localStorage.removeItem(`expert-profile-step-${user.id}`)
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

