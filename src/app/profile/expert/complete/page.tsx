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
    serviceRegions: [] as string[],
    newHashtag: '',
    newRegion: '',
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get expert profile
    const { data: profile } = await supabase
      .from('expert_profiles')
      .select('id, is_profile_complete')
      .eq('user_id', user.id)
      .single()

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

  const addRegion = () => {
    if (formData.newRegion && !formData.serviceRegions.includes(formData.newRegion)) {
      setFormData({
        ...formData,
        serviceRegions: [...formData.serviceRegions, formData.newRegion],
        newRegion: ''
      })
    }
  }

  const removeRegion = (region: string) => {
    setFormData({
      ...formData,
      serviceRegions: formData.serviceRegions.filter(r => r !== region)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expertId) return

    setLoading(true)

    try {
      // Update expert profile
      const { error: updateError } = await db.experts.updateProfile(expertId, {
        career_history: formData.career,
        education: formData.education,
        hashtags: formData.hashtags,
        service_regions: formData.serviceRegions,
      })

      if (updateError) throw updateError

      // Generate auto hashtags
      await db.experts.updateHashtags(expertId)

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert('프로필 업데이트 중 오류가 발생했습니다.')
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
                      
                      <div className="grid grid-cols-2 gap-4">
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
                  경력과 학력을 기반으로 자동 생성되며, 추가로 입력할 수 있습니다.
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

              {/* Service Regions */}
              <div>
                <Label className="text-lg">서비스 가능 지역</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={formData.newRegion}
                    onChange={(e) => setFormData({ ...formData, newRegion: e.target.value })}
                    placeholder="지역 추가 (예: 서울, 경기, 전국)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRegion())}
                  />
                  <Button type="button" onClick={addRegion}>추가</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.serviceRegions.map((region) => (
                    <span
                      key={region}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      {region}
                      <button
                        type="button"
                        onClick={() => removeRegion(region)}
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '저장 중...' : '프로필 완성하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}