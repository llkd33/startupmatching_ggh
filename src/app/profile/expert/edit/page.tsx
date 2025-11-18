'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'
import { Plus, X, Briefcase, GraduationCap, MapPin, Hash, User, Check } from 'lucide-react'

interface CareerItem {
  id: string
  company: string
  position: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

interface EducationItem {
  id: string
  school: string
  degree: string
  field: string
  graduationDate: string
}

interface ProfileData {
  name: string
  bio: string
  skills: string[]
  serviceRegions: string[]
  hourlyRate: number | null
  portfolioUrl: string
  careerHistory: CareerItem[]
  education: EducationItem[]
  isAvailable: boolean
}

const AVAILABLE_SKILLS = [
  '투자', '유통', '마케팅', '비즈니스 개발', '재무', '법무', 'HR', '브랜딩',
  '영업', '전략', '창업', '스케일링', '펀딩', 'M&A', 'IPO', '세일즈',
  '고객 성장', '제품 기획', '데이터 분석', '컨설팅', '경영', '조직 운영',
  '글로벌 진출', '파트너십', '공급망 관리', '디지털 마케팅', '콘텐츠 마케팅'
]

const SERVICE_REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
]

export default function ExpertProfileEditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [completeness, setCompleteness] = useState(0)
  const [autoHashtags, setAutoHashtags] = useState<string[]>([])
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    bio: '',
    skills: [],
    serviceRegions: [],
    hourlyRate: null,
    portfolioUrl: '',
    careerHistory: [],
    education: [],
    isAvailable: true
  })

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    calculateCompleteness()
    generateHashtags()
  }, [profileData])

  const loadProfile = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUserId(user.id)

    // Load existing profile
    const { data: profile } = await supabase
      .from('expert_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setProfileData({
        name: profile.name || '',
        bio: profile.bio || '',
        skills: profile.skills || [],
        serviceRegions: profile.service_regions || [],
        hourlyRate: profile.hourly_rate,
        portfolioUrl: profile.portfolio_url || '',
        careerHistory: profile.career_history || [],
        education: profile.education || [],
        isAvailable: profile.is_available ?? true
      })
    }

    setLoading(false)
  }

  const calculateCompleteness = () => {
    let score = 0
    const checks = [
      profileData.name,
      profileData.bio,
      profileData.skills.length > 0,
      profileData.serviceRegions.length > 0,
      profileData.careerHistory.length > 0,
      profileData.education.length > 0,
      profileData.hourlyRate !== null,
      profileData.portfolioUrl
    ]
    
    checks.forEach(check => {
      if (check) score += 12.5
    })
    
    setCompleteness(Math.min(100, score))
  }

  const generateHashtags = () => {
    const hashtags = new Set<string>()
    
    // Add skills as hashtags
    profileData.skills.forEach(skill => {
      hashtags.add(`#${skill.replace(/\s+/g, '')}`)
    })
    
    // Add positions from career
    profileData.careerHistory.forEach(career => {
      const position = career.position.toLowerCase()
      if (position.includes('개발')) hashtags.add('#개발자')
      if (position.includes('디자인')) hashtags.add('#디자이너')
      if (position.includes('마케팅')) hashtags.add('#마케터')
      if (position.includes('기획')) hashtags.add('#기획자')
      if (position.includes('대표') || position.includes('CEO')) hashtags.add('#창업가')
      if (position.includes('CTO')) hashtags.add('#CTO')
    })
    
    // Add education-based tags
    profileData.education.forEach(edu => {
      const field = edu.field.toLowerCase()
      if (field.includes('컴퓨터') || field.includes('소프트웨어')) hashtags.add('#IT전문가')
      if (field.includes('경영') || field.includes('MBA')) hashtags.add('#경영전문가')
      if (field.includes('디자인')) hashtags.add('#디자인전공')
    })
    
    setAutoHashtags(Array.from(hashtags))
  }

  const addCareerItem = () => {
    setProfileData(prev => ({
      ...prev,
      careerHistory: [...prev.careerHistory, {
        id: Date.now().toString(),
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        description: ''
      }]
    }))
  }

  const updateCareerItem = (id: string, field: keyof CareerItem, value: any) => {
    setProfileData(prev => ({
      ...prev,
      careerHistory: prev.careerHistory.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeCareerItem = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      careerHistory: prev.careerHistory.filter(item => item.id !== id)
    }))
  }

  const addEducationItem = () => {
    setProfileData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: Date.now().toString(),
        school: '',
        degree: '',
        field: '',
        graduationDate: ''
      }]
    }))
  }

  const updateEducationItem = (id: string, field: keyof EducationItem, value: any) => {
    setProfileData(prev => ({
      ...prev,
      education: prev.education.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeEducationItem = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      education: prev.education.filter(item => item.id !== id)
    }))
  }

  const toggleSkill = (skill: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  const toggleRegion = (region: string) => {
    setProfileData(prev => ({
      ...prev,
      serviceRegions: prev.serviceRegions.includes(region)
        ? prev.serviceRegions.filter(r => r !== region)
        : [...prev.serviceRegions, region]
    }))
  }

  const saveProfile = async () => {
    if (!userId) return

    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('expert_profiles')
        .upsert({
          user_id: userId,
          name: profileData.name,
          bio: profileData.bio,
          skills: profileData.skills,
          service_regions: profileData.serviceRegions,
          hourly_rate: profileData.hourlyRate,
          portfolio_url: profileData.portfolioUrl,
          career_history: profileData.careerHistory,
          education: profileData.education,
          is_available: profileData.isAvailable,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (error) throw error

      alert('프로필이 저장되었습니다!')
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      alert('프로필 저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>프로필을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Completeness */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">프로필 관리</h1>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">프로필 완성도</span>
              <span className="text-sm font-bold">{completeness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
            {completeness < 100 && (
              <p className="text-xs text-gray-500 mt-2">
                프로필을 완성하면 더 많은 기회를 얻을 수 있습니다!
              </p>
            )}
          </div>
        </div>

        {/* Auto-generated Hashtags */}
        {autoHashtags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                자동 생성된 해시태그
              </CardTitle>
              <CardDescription>
                프로필 정보를 기반으로 자동 생성된 해시태그입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {autoHashtags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content with Tabs */}
        <div className="bg-white rounded-lg shadow">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex border-b">
              <TabsTrigger 
                value="basic" 
                className="flex-1 py-3 px-4 text-center border-b-2 border-transparent data-[state=active]:border-blue-600"
              >
                <User className="inline-block w-4 h-4 mr-2" />
                기본 정보
              </TabsTrigger>
              <TabsTrigger 
                value="career"
                className="flex-1 py-3 px-4 text-center border-b-2 border-transparent data-[state=active]:border-blue-600"
              >
                <Briefcase className="inline-block w-4 h-4 mr-2" />
                경력
              </TabsTrigger>
              <TabsTrigger 
                value="education"
                className="flex-1 py-3 px-4 text-center border-b-2 border-transparent data-[state=active]:border-blue-600"
              >
                <GraduationCap className="inline-block w-4 h-4 mr-2" />
                학력
              </TabsTrigger>
              <TabsTrigger 
                value="skills"
                className="flex-1 py-3 px-4 text-center border-b-2 border-transparent data-[state=active]:border-blue-600"
              >
                <Hash className="inline-block w-4 h-4 mr-2" />
                스킬 & 지역
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">자기소개</Label>
                <textarea
                  id="bio"
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input"
                  placeholder="간단한 자기소개를 작성해주세요 (500자 이내)"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">{profileData.bio.length}/500</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">시간당 요금 (원)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={profileData.hourlyRate || ''}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      hourlyRate: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl">포트폴리오 URL</Label>
                  <Input
                    id="portfolioUrl"
                    type="url"
                    placeholder="https://..."
                    value={profileData.portfolioUrl}
                    onChange={(e) => setProfileData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-1">
                  <Label htmlFor="isAvailable" className="text-base font-medium">
                    현재 프로젝트 수행 가능
                  </Label>
                  <p className="text-sm text-gray-500">
                    새 프로젝트를 받을 수 있는 상태라면 켜 주세요.
                  </p>
                </div>
                <Switch
                  id="isAvailable"
                  checked={profileData.isAvailable}
                  onCheckedChange={(checked) => setProfileData(prev => ({
                    ...prev,
                    isAvailable: checked
                  }))}
                  aria-label="현재 프로젝트 수행 가능 여부"
                />
              </div>
            </TabsContent>

            {/* Career Tab */}
            <TabsContent value="career" className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">경력 사항</h3>
                  <Button onClick={addCareerItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    경력 추가
                  </Button>
                </div>

                {profileData.careerHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    경력을 추가해주세요
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profileData.careerHistory.map((career) => (
                      <Card key={career.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCareerItem(career.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>회사명</Label>
                              <Input
                                value={career.company}
                                onChange={(e) => updateCareerItem(career.id, 'company', e.target.value)}
                                placeholder="회사명"
                              />
                            </div>
                            <div>
                              <Label>직책</Label>
                              <Input
                                value={career.position}
                                onChange={(e) => updateCareerItem(career.id, 'position', e.target.value)}
                                placeholder="직책"
                              />
                            </div>
                            <div>
                              <Label>시작일</Label>
                              <Input
                                type="month"
                                value={career.startDate}
                                onChange={(e) => updateCareerItem(career.id, 'startDate', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>종료일</Label>
                              <Input
                                type="month"
                                value={career.endDate}
                                onChange={(e) => updateCareerItem(career.id, 'endDate', e.target.value)}
                                disabled={career.current}
                              />
                              <label className="flex items-center mt-2">
                                <input
                                  type="checkbox"
                                  checked={career.current}
                                  onChange={(e) => updateCareerItem(career.id, 'current', e.target.checked)}
                                  className="mr-2"
                                />
                                <span className="text-sm">현재 재직 중</span>
                              </label>
                            </div>
                            <div className="col-span-2">
                              <Label>업무 설명</Label>
                              <textarea
                                className="w-full px-3 py-2 rounded-md border border-input"
                                rows={3}
                                value={career.description}
                                onChange={(e) => updateCareerItem(career.id, 'description', e.target.value)}
                                placeholder="주요 업무와 성과를 간단히 설명해주세요"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">학력 사항</h3>
                  <Button onClick={addEducationItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    학력 추가
                  </Button>
                </div>

                {profileData.education.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    학력을 추가해주세요
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profileData.education.map((edu) => (
                      <Card key={edu.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEducationItem(edu.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>학교명</Label>
                              <Input
                                value={edu.school}
                                onChange={(e) => updateEducationItem(edu.id, 'school', e.target.value)}
                                placeholder="학교명"
                              />
                            </div>
                            <div>
                              <Label>학위</Label>
                              <select
                                className="w-full h-10 px-3 rounded-md border border-input"
                                value={edu.degree}
                                onChange={(e) => updateEducationItem(edu.id, 'degree', e.target.value)}
                              >
                                <option value="">선택</option>
                                <option value="학사">학사</option>
                                <option value="석사">석사</option>
                                <option value="박사">박사</option>
                                <option value="전문학사">전문학사</option>
                              </select>
                            </div>
                            <div>
                              <Label>전공</Label>
                              <Input
                                value={edu.field}
                                onChange={(e) => updateEducationItem(edu.id, 'field', e.target.value)}
                                placeholder="전공"
                              />
                            </div>
                            <div>
                              <Label>졸업년월</Label>
                              <Input
                                type="month"
                                value={edu.graduationDate}
                                onChange={(e) => updateEducationItem(edu.id, 'graduationDate', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Skills & Regions Tab */}
            <TabsContent value="skills" className="p-6 space-y-6">
              <div>
                <h3 className="font-medium mb-4">보유 스킬</h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        profileData.skills.includes(skill)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {profileData.skills.includes(skill) && <Check className="inline-block w-3 h-3 mr-1" />}
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  서비스 가능 지역
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {SERVICE_REGIONS.map(region => (
                    <button
                      key={region}
                      onClick={() => toggleRegion(region)}
                      className={`px-3 py-2 rounded text-sm transition-all ${
                        profileData.serviceRegions.includes(region)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {profileData.serviceRegions.includes(region) && <Check className="inline-block w-3 h-3 mr-1" />}
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            취소
          </Button>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? '저장 중...' : '프로필 저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
