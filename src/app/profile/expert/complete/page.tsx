'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, db } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'

interface CareerItem {
  company: string
  position: string
  start_date: string
  end_date: string
  description: string
}

interface EducationItem {
  school: string
  major: string
  degree: string
  status: '졸업' | '졸업예정' | '재학' | '휴학' | '중퇴'
  graduation_year: string
}

export default function CompleteExpertProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expertId, setExpertId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    career: [] as CareerItem[],
    education: [] as EducationItem[],
    hashtags: [] as string[],
    newHashtag: '',
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('User:', user)
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get expert profile
    const { data: profile, error } = await supabase
      .from('expert_profiles')
      .select('id, is_profile_complete')
      .eq('user_id', user.id)
      .single()
    
    console.log('Expert profile:', profile)
    console.log('Profile error:', error)

    if (error && error.code === 'PGRST116') {
      // No profile found - create one
      console.log('Creating new expert profile for user:', user.id)
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
        console.error('Failed to create profile:', createError)
        alert('프로필 생성 중 오류가 발생했습니다. 다시 시도해주세요.')
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
  }

  const addCareerItem = () => {
    setFormData({
      ...formData,
      career: [...formData.career, {
        company: '',
        position: '',
        start_date: '',
        end_date: '',
        description: ''
      }]
    })
  }

  const removeCareerItem = (index: number) => {
    setFormData({
      ...formData,
      career: formData.career.filter((_, i) => i !== index)
    })
  }

  const updateCareerItem = (index: number, field: keyof CareerItem, value: string) => {
    const updatedCareer = [...formData.career]
    updatedCareer[index] = { ...updatedCareer[index], [field]: value }
    setFormData({ ...formData, career: updatedCareer })
  }

  const addEducationItem = () => {
    setFormData({
      ...formData,
      education: [...formData.education, {
        school: '',
        major: '',
        degree: '',
        status: '졸업',
        graduation_year: ''
      }]
    })
  }

  const removeEducationItem = (index: number) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index)
    })
  }

  const updateEducationItem = (index: number, field: keyof EducationItem, value: string) => {
    const updatedEducation = [...formData.education]
    updatedEducation[index] = { ...updatedEducation[index], [field]: value }
    setFormData({ ...formData, education: updatedEducation })
  }

  const addHashtag = () => {
    if (formData.newHashtag && !formData.hashtags.includes(formData.newHashtag)) {
      setFormData({
        ...formData,
        hashtags: [...formData.hashtags, formData.newHashtag],
        newHashtag: ''
      })
    }
  }

  const removeHashtag = (tag: string) => {
    setFormData({
      ...formData,
      hashtags: formData.hashtags.filter(t => t !== tag)
    })
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Submit clicked - expertId:', expertId)
    console.log('Form data:', formData)
    
    if (!expertId) {
      console.error('No expert ID found')
      alert('전문가 프로필을 찾을 수 없습니다. 다시 로그인해주세요.')
      return
    }

    setLoading(true)

    try {
      // Update expert profile
      const { error: updateError } = await db.experts.updateProfile(expertId, {
        career_history: formData.career,
        education: formData.education,
        hashtags: formData.hashtags,
        is_profile_complete: true,
      })

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      // Generate auto hashtags - optional, don't fail if this doesn't work
      try {
        await db.experts.updateHashtags(expertId)
      } catch (hashtagError) {
        console.warn('Failed to generate hashtags:', hashtagError)
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert(`프로필 업데이트 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>전문가 프로필 완성하기</CardTitle>
            <CardDescription>
              프로필을 완성하면 캠페인 매칭을 시작할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Career History */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg">경력사항</Label>
                  <Button type="button" onClick={addCareerItem} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> 경력 추가
                  </Button>
                </div>
                
                {formData.career.map((item, index) => (
                  <Card key={index} className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex justify-end mb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCareerItem(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>회사명</Label>
                          <Input
                            value={item.company}
                            onChange={(e) => updateCareerItem(index, 'company', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label>직책</Label>
                          <Input
                            value={item.position}
                            onChange={(e) => updateCareerItem(index, 'position', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label>시작일</Label>
                          <Input
                            type="month"
                            value={item.start_date}
                            onChange={(e) => updateCareerItem(index, 'start_date', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label>종료일</Label>
                          <Input
                            type="month"
                            value={item.end_date}
                            onChange={(e) => updateCareerItem(index, 'end_date', e.target.value)}
                            placeholder="재직 중인 경우 비워두세요"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>주요 업무</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateCareerItem(index, 'description', e.target.value)}
                            placeholder="주요 업무를 간단히 설명해주세요"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Education */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg">학력사항</Label>
                  <Button type="button" onClick={addEducationItem} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> 학력 추가
                  </Button>
                </div>
                
                {formData.education.map((item, index) => (
                  <Card key={index} className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex justify-end mb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEducationItem(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label>학교명</Label>
                          <Input
                            value={item.school}
                            onChange={(e) => updateEducationItem(index, 'school', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label>전공</Label>
                          <Input
                            value={item.major}
                            onChange={(e) => updateEducationItem(index, 'major', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label>학위</Label>
                          <Input
                            value={item.degree}
                            onChange={(e) => updateEducationItem(index, 'degree', e.target.value)}
                            placeholder="학사, 석사, 박사 등"
                            required
                          />
                        </div>
                        <div>
                          <Label>졸업상태</Label>
                          <select
                            value={item.status || '졸업'}
                            onChange={(e) => updateEducationItem(index, 'status', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="졸업">졸업</option>
                            <option value="졸업예정">졸업예정</option>
                            <option value="재학">재학</option>
                            <option value="휴학">휴학</option>
                            <option value="중퇴">중퇴</option>
                          </select>
                        </div>
                        <div>
                          <Label>졸업년도</Label>
                          <Input
                            type="number"
                            value={item.graduation_year}
                            onChange={(e) => updateEducationItem(index, 'graduation_year', e.target.value)}
                            placeholder="2020"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Hashtags */}
              <div>
                <Label className="text-lg">전문 분야 태그</Label>
                <p className="text-sm text-gray-600 mb-2">
                  전문 분야 태그를 추가해주세요.
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={formData.newHashtag}
                    onChange={(e) => setFormData({ ...formData, newHashtag: e.target.value })}
                    placeholder="태그 추가"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                  />
                  <Button type="button" onClick={addHashtag}>추가</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>


              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                onClick={() => console.log('Button clicked!')}
              >
                {loading ? '저장 중...' : '프로필 완성하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}