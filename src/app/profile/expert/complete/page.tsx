'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, db } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MultiStepWizard } from '@/components/ui/multi-step-wizard'
import { useToast } from '@/components/ui/toast-provider'
import {
  BasicInfoStep,
  WorkExperienceStep,
  EducationStep,
  SkillsStep,
  AvailabilityStep
} from '@/components/expert/profile-wizard-steps'

interface ProfileData {
  // Basic Info
  name: string
  title: string
  location: string
  phone: string
  email: string
  
  // Work Experience
  career: Array<{
    company: string
    position: string
    start_date: string
    end_date: string
    description: string
  }>
  
  // Education
  education: Array<{
    school: string
    major: string
    degree: string
    status: '졸업' | '졸업예정' | '재학' | '휴학' | '중퇴'
    graduation_year: string
  }>
  
  // Skills
  hashtags: string[]
  newHashtag: string
  
  // Availability
  hourlyRate: string
  availability: string
  preferredWorkType: string
  portfolio: string
  introduction: string
}

export default function EnhancedExpertProfilePage() {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [expertId, setExpertId] = useState<string | null>(null)
  const [savedStep, setSavedStep] = useState(0)
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    title: '',
    location: '',
    phone: '',
    email: '',
    career: [],
    education: [],
    hashtags: [],
    newHashtag: '',
    hourlyRate: '',
    availability: '',
    preferredWorkType: '',
    portfolio: '',
    introduction: ''
  })

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

    // Set email from auth user
    setProfileData(prev => ({ ...prev, email: user.email || '' }))

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
      return
    }

    if (profile?.is_profile_complete) {
      router.push('/dashboard')
      return
    }

    setExpertId(profile?.id || null)
    
    // Load existing profile data if available
    if (profile) {
      setProfileData(prev => ({
        ...prev,
        name: profile.name || '',
        title: profile.title || '',
        location: profile.location || '',
        phone: profile.phone || '',
        career: profile.career_history || [],
        education: profile.education || [],
        hashtags: profile.hashtags || [],
        hourlyRate: profile.hourly_rate || '',
        availability: profile.availability || '',
        preferredWorkType: profile.preferred_work_type || '',
        portfolio: profile.portfolio || '',
        introduction: profile.introduction || ''
      }))
      
      // Load saved step from localStorage
      const saved = localStorage.getItem(`expert-profile-step-${user.id}`)
      if (saved) {
        setSavedStep(parseInt(saved))
      }
    }
  }

  const updateProfileData = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const saveProgress = async (currentStep: number) => {
    if (!expertId) return
    
    // Save current step to localStorage
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) {
      localStorage.setItem(`expert-profile-step-${user.id}`, currentStep.toString())
    }
    
    // Save partial profile data
    try {
      await db.experts.updateProfile(expertId, {
        name: profileData.name,
        title: profileData.title,
        location: profileData.location,
        phone: profileData.phone,
        career_history: profileData.career,
        education: profileData.education,
        hashtags: profileData.hashtags,
        hourly_rate: profileData.hourlyRate,
        availability: profileData.availability,
        preferred_work_type: profileData.preferredWorkType,
        portfolio: profileData.portfolio,
        introduction: profileData.introduction
      })
      success('진행상황이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const completeProfile = async () => {
    if (!expertId) {
      showError('전문가 프로필을 찾을 수 없습니다.')
      return
    }

    setLoading(true)

    try {
      // Update expert profile with complete flag
      const { error: updateError } = await db.experts.updateProfile(expertId, {
        name: profileData.name,
        title: profileData.title,
        location: profileData.location,
        phone: profileData.phone,
        career_history: profileData.career,
        education: profileData.education,
        hashtags: profileData.hashtags,
        hourly_rate: profileData.hourlyRate,
        availability: profileData.availability,
        preferred_work_type: profileData.preferredWorkType,
        portfolio: profileData.portfolio,
        introduction: profileData.introduction,
        is_profile_complete: true,
      })

      if (updateError) {
        throw updateError
      }

      // Generate auto hashtags
      try {
        await db.experts.updateHashtags(expertId)
      } catch (hashtagError) {
        console.warn('Failed to generate hashtags:', hashtagError)
      }

      // Clear saved step
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (user) {
        localStorage.removeItem(`expert-profile-step-${user.id}`)
      }

      success('프로필이 성공적으로 완성되었습니다!')
      router.push('/dashboard')
    } catch (error: any) {
      showError(`프로필 업데이트 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const validateBasicInfo = () => {
    return !!(profileData.name && profileData.title && profileData.location && profileData.phone && profileData.email)
  }

  const validateWorkExperience = () => {
    // Optional step - always valid but check if added items are complete
    return profileData.career.every(item => item.company && item.position && item.start_date)
  }

  const validateEducation = () => {
    // Optional step - always valid but check if added items are complete
    return profileData.education.every(item => item.school && item.major && item.degree && item.graduation_year)
  }

  const validateSkills = () => {
    // At least one skill tag is recommended but not required
    return true
  }

  const validateAvailability = () => {
    // Optional fields - always valid
    return true
  }

  const wizardSteps = [
    {
      id: 'basic-info',
      title: '기본 정보',
      description: '이름, 직책, 연락처 등 기본 정보를 입력해주세요',
      component: (
        <BasicInfoStep
          data={{
            name: profileData.name,
            title: profileData.title,
            location: profileData.location,
            phone: profileData.phone,
            email: profileData.email
          }}
          onChange={updateProfileData}
        />
      ),
      validation: validateBasicInfo
    },
    {
      id: 'work-experience',
      title: '경력 사항',
      description: '경력 사항을 추가해주세요 (선택사항)',
      component: (
        <WorkExperienceStep
          data={profileData.career}
          onChange={(careers) => updateProfileData('career', careers)}
        />
      ),
      validation: validateWorkExperience
    },
    {
      id: 'education',
      title: '학력 사항',
      description: '학력 정보를 추가해주세요 (선택사항)',
      component: (
        <EducationStep
          data={profileData.education}
          onChange={(education) => updateProfileData('education', education)}
        />
      ),
      validation: validateEducation
    },
    {
      id: 'skills',
      title: '전문 분야',
      description: '전문 분야와 기술 스택을 태그로 추가해주세요',
      component: (
        <SkillsStep
          data={{
            hashtags: profileData.hashtags,
            newHashtag: profileData.newHashtag
          }}
          onChange={updateProfileData}
        />
      ),
      validation: validateSkills
    },
    {
      id: 'availability',
      title: '참여 조건',
      description: '프로젝트 참여 조건과 자기소개를 입력해주세요',
      component: (
        <AvailabilityStep
          data={{
            hourlyRate: profileData.hourlyRate,
            availability: profileData.availability,
            preferredWorkType: profileData.preferredWorkType,
            portfolio: profileData.portfolio,
            introduction: profileData.introduction
          }}
          onChange={updateProfileData}
        />
      ),
      validation: validateAvailability
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">전문가 프로필 완성하기</CardTitle>
            <CardDescription>
              단계별로 프로필을 완성해주세요. 언제든지 저장하고 나중에 이어서 작성할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiStepWizard
              steps={wizardSteps}
              onComplete={completeProfile}
              onSaveProgress={saveProgress}
              initialStep={savedStep}
              showProgressBar={true}
              allowNavigation={true}
            />
            
            <div className="mt-6 pt-6 border-t flex justify-center">
              <Button 
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                isLoading={loading}
              >
                나중에 완성하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
