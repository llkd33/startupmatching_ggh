'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X, HelpCircle, AlertCircle } from 'lucide-react'
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFormValidation, validationPatterns } from '@/hooks/useFormValidation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BasicInfoStepProps {
  data: {
    name: string
    title: string
    location: string
    phone: string
    email: string
  }
  onChange: (field: string, value: string) => void
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const { errors, touched, handleChange, handleBlur, validateAllFields, setValues } = useFormValidation(
    data,
    {
      name: { required: true, minLength: 2, maxLength: 50 },
      title: { required: true, minLength: 2, maxLength: 100 },
      location: { required: true, minLength: 2, maxLength: 100 },
      phone: { required: true, phone: true },
      email: { required: true, email: true }
    },
    { mode: 'onBlur', reValidateMode: 'onChange' }
  )

  // Update form values when data changes
  useEffect(() => {
    setValues(data)
  }, [data])

  const handleFieldChange = (field: string, value: string) => {
    onChange(field, value)
    handleChange(field as any, value)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="name">이름 *</Label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                실명을 입력해주세요
              </div>
            </div>
          </div>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleBlur('name' as any)}
            placeholder="홍길동"
            className={cn(
              touched.name && errors.name && "border-red-500 focus:ring-red-500"
            )}
            required
          />
          {touched.name && errors.name && (
            <div className="flex items-center gap-1 text-red-500 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.name}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="title">직책/전문분야 *</Label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                현재 직책 또는 전문 분야
              </div>
            </div>
          </div>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            onBlur={() => handleBlur('title' as any)}
            placeholder="시니어 개발자"
            className={cn(
              touched.title && errors.title && "border-red-500 focus:ring-red-500"
            )}
            required
          />
          {touched.title && errors.title && (
            <div className="flex items-center gap-1 text-red-500 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.title}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">근무 지역 *</Label>
          <Input
            id="location"
            value={data.location}
            onChange={(e) => handleFieldChange('location', e.target.value)}
            onBlur={() => handleBlur('location' as any)}
            placeholder="서울특별시 강남구"
            className={cn(
              touched.location && errors.location && "border-red-500 focus:ring-red-500"
            )}
            required
          />
          {touched.location && errors.location && (
            <div className="flex items-center gap-1 text-red-500 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.location}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">연락처 *</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone' as any)}
            placeholder="010-0000-0000"
            className={cn(
              touched.phone && errors.phone && "border-red-500 focus:ring-red-500"
            )}
            required
          />
          {touched.phone && errors.phone && (
            <div className="flex items-center gap-1 text-red-500 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.phone}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="email">이메일 *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleBlur('email' as any)}
            placeholder="email@example.com"
            className={cn(
              touched.email && errors.email && "border-red-500 focus:ring-red-500"
            )}
            required
          />
          {touched.email && errors.email && (
            <div className="flex items-center gap-1 text-red-500 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface CareerItem {
  company: string
  position: string
  start_date: string
  end_date: string
  description: string
}

interface WorkExperienceStepProps {
  data: CareerItem[]
  onChange: (careers: CareerItem[]) => void
}

export function WorkExperienceStep({ data, onChange }: WorkExperienceStepProps) {
  const addCareerItem = () => {
    onChange([...data, {
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      description: ''
    }])
  }

  const removeCareerItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  const updateCareerItem = (index: number, field: keyof CareerItem, value: string) => {
    const updatedCareer = [...data]
    updatedCareer[index] = { ...updatedCareer[index], [field]: value }
    onChange(updatedCareer)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            경력사항을 추가해주세요. 최신 경력부터 입력하는 것을 권장합니다.
          </p>
        </div>
        <Button type="button" onClick={addCareerItem} size="sm">
          <Plus className="w-4 h-4 mr-1" /> 경력 추가
        </Button>
      </div>

      {data.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-gray-500">
            아직 추가된 경력이 없습니다. 경력을 추가해주세요.
          </CardContent>
        </Card>
      )}
      
      {data.map((item, index) => (
        <Card key={index}>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>회사명 *</Label>
                <Input
                  value={item.company}
                  onChange={(e) => updateCareerItem(index, 'company', e.target.value)}
                  placeholder="회사명 입력"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>직책 *</Label>
                <Input
                  value={item.position}
                  onChange={(e) => updateCareerItem(index, 'position', e.target.value)}
                  placeholder="직책 입력"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>시작일 *</Label>
                <Input
                  type="month"
                  value={item.start_date}
                  onChange={(e) => updateCareerItem(index, 'start_date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="month"
                  value={item.end_date}
                  onChange={(e) => updateCareerItem(index, 'end_date', e.target.value)}
                  placeholder="재직 중인 경우 비워두세요"
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label>주요 업무</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateCareerItem(index, 'description', e.target.value)}
                  placeholder="주요 업무와 성과를 간단히 설명해주세요"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface EducationItem {
  school: string
  major: string
  degree: string
  status: '졸업' | '졸업예정' | '재학' | '휴학' | '중퇴'
  graduation_year: string
}

interface EducationStepProps {
  data: EducationItem[]
  onChange: (education: EducationItem[]) => void
}

export function EducationStep({ data, onChange }: EducationStepProps) {
  const addEducationItem = () => {
    onChange([...data, {
      school: '',
      major: '',
      degree: '',
      status: '졸업',
      graduation_year: ''
    }])
  }

  const removeEducationItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  const updateEducationItem = (index: number, field: keyof EducationItem, value: string) => {
    const updatedEducation = [...data]
    updatedEducation[index] = { ...updatedEducation[index], [field]: value }
    onChange(updatedEducation)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            학력사항을 추가해주세요. 최종 학력부터 입력하는 것을 권장합니다.
          </p>
        </div>
        <Button type="button" onClick={addEducationItem} size="sm">
          <Plus className="w-4 h-4 mr-1" /> 학력 추가
        </Button>
      </div>

      {data.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-gray-500">
            아직 추가된 학력이 없습니다. 학력을 추가해주세요.
          </CardContent>
        </Card>
      )}
      
      {data.map((item, index) => (
        <Card key={index}>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>학교명 *</Label>
                <Input
                  value={item.school}
                  onChange={(e) => updateEducationItem(index, 'school', e.target.value)}
                  placeholder="학교명 입력"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>전공 *</Label>
                <Input
                  value={item.major}
                  onChange={(e) => updateEducationItem(index, 'major', e.target.value)}
                  placeholder="전공 입력"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>학위 *</Label>
                <Input
                  value={item.degree}
                  onChange={(e) => updateEducationItem(index, 'degree', e.target.value)}
                  placeholder="학사, 석사, 박사 등"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>졸업상태 *</Label>
                <Select
                  value={item.status || '졸업'}
                  onValueChange={(value) => updateEducationItem(index, 'status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="졸업">졸업</SelectItem>
                    <SelectItem value="졸업예정">졸업예정</SelectItem>
                    <SelectItem value="재학">재학</SelectItem>
                    <SelectItem value="휴학">휴학</SelectItem>
                    <SelectItem value="중퇴">중퇴</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>졸업년도 *</Label>
                <Input
                  type="number"
                  value={item.graduation_year}
                  onChange={(e) => updateEducationItem(index, 'graduation_year', e.target.value)}
                  placeholder="2020"
                  min="1950"
                  max={new Date().getFullYear() + 10}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface SkillsStepProps {
  data: {
    hashtags: string[]
    newHashtag: string
  }
  onChange: (field: string, value: string | string[]) => void
}

export function SkillsStep({ data, onChange }: SkillsStepProps) {
  const addHashtag = () => {
    if (data.newHashtag && !data.hashtags.includes(data.newHashtag)) {
      onChange('hashtags', [...data.hashtags, data.newHashtag])
      onChange('newHashtag', '')
    }
  }

  const removeHashtag = (tag: string) => {
    onChange('hashtags', data.hashtags.filter(t => t !== tag))
  }

  const suggestedTags = [
    '투자', '유통', '마케팅', '비즈니스 개발', '재무', '법무', 'HR', '브랜딩',
    '영업', '전략', '창업', '스케일링', '펀딩', 'M&A', 'IPO', '세일즈',
    '고객 성장', '제품 기획', '데이터 분석', '컨설팅', '경영', '조직 운영'
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600 mb-4">
          전문 분야와 기술 스택을 태그로 추가해주세요. 이는 프로젝트 매칭에 중요한 정보입니다.
        </p>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={data.newHashtag}
              onChange={(e) => onChange('newHashtag', e.target.value)}
              placeholder="태그 입력 (예: 투자, 마케팅, 비즈니스 개발)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addHashtag()
                }
              }}
              className="flex-1"
            />
            <Button type="button" onClick={addHashtag}>추가</Button>
          </div>

          {/* Current Tags */}
          {data.hashtags.length > 0 && (
            <div>
              <Label className="text-sm text-gray-700 mb-2 block">현재 태그</Label>
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="ml-2 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tags */}
          <div>
            <Label className="text-sm text-gray-700 mb-2 block">추천 태그</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedTags
                .filter(tag => !data.hashtags.includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      onChange('hashtags', [...data.hashtags, tag])
                    }}
                    className="px-3 py-1 rounded-full text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AvailabilityStepProps {
  data: {
    hourlyRate: string
    availability: string
    preferredWorkType: string
    portfolio: string
    introduction: string
  }
  onChange: (field: string, value: string) => void
}

export function AvailabilityStep({ data, onChange }: AvailabilityStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="hourlyRate">시간당 단가</Label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                협의 가능한 경우 비워두셔도 됩니다
              </div>
            </div>
          </div>
          <Input
            id="hourlyRate"
            type="number"
            value={data.hourlyRate}
            onChange={(e) => onChange('hourlyRate', e.target.value)}
            placeholder="100000"
          />
          <p className="text-xs text-gray-500">원/시간</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability">참여 가능 시간</Label>
          <Select
            value={data.availability}
            onValueChange={(value) => onChange('availability', value)}
          >
            <SelectTrigger id="availability">
              <SelectValue placeholder="선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">풀타임 (주 40시간)</SelectItem>
              <SelectItem value="part-time-20">파트타임 (주 20시간)</SelectItem>
              <SelectItem value="part-time-10">파트타임 (주 10시간)</SelectItem>
              <SelectItem value="flexible">협의 가능</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredWorkType">선호하는 근무 형태</Label>
          <Select
            value={data.preferredWorkType}
            onValueChange={(value) => onChange('preferredWorkType', value)}
          >
            <SelectTrigger id="preferredWorkType">
              <SelectValue placeholder="선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">원격 근무</SelectItem>
              <SelectItem value="onsite">사무실 출근</SelectItem>
              <SelectItem value="hybrid">하이브리드</SelectItem>
              <SelectItem value="flexible">협의 가능</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolio">포트폴리오 URL</Label>
          <Input
            id="portfolio"
            type="url"
            value={data.portfolio}
            onChange={(e) => onChange('portfolio', e.target.value)}
            placeholder="https://github.com/username"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="introduction">자기소개</Label>
        <Textarea
          id="introduction"
          value={data.introduction}
          onChange={(e) => onChange('introduction', e.target.value)}
          placeholder="간단한 자기소개와 전문 분야, 경험 등을 작성해주세요."
          rows={5}
        />
        <p className="text-xs text-gray-500">
          {data.introduction.length}/500자
        </p>
      </div>
    </div>
  )
}