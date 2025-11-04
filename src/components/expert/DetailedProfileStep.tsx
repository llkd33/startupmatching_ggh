'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DetailedProfileStepProps {
  data: {
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
  onChange: (field: string, value: any) => void
}

export function DetailedProfileStep({ data, onChange }: DetailedProfileStepProps) {
  const addCareer = () => {
    onChange('career', [...data.career, {
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      description: ''
    }])
  }

  const updateCareer = (index: number, field: string, value: string) => {
    const updated = [...data.career]
    updated[index] = { ...updated[index], [field]: value }
    onChange('career', updated)
  }

  const removeCareer = (index: number) => {
    onChange('career', data.career.filter((_, i) => i !== index))
  }

  const addEducation = () => {
    onChange('education', [...data.education, {
      school: '',
      major: '',
      degree: '',
      status: '졸업',
      graduation_year: ''
    }])
  }

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...data.education]
    updated[index] = { ...updated[index], [field]: value }
    onChange('education', updated)
  }

  const removeEducation = (index: number) => {
    onChange('education', data.education.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          ✨ <strong>선택 사항:</strong> 상세 정보를 입력하면 더 많은 기회를 받을 수 있습니다. 나중에 언제든지 추가할 수 있습니다.
        </p>
      </div>

      {/* 경력 정보 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">경력 사항</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCareer}
            className="min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            경력 추가
          </Button>
        </div>

        {data.career.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              아직 등록된 경력이 없습니다. 경력을 추가해주세요.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.career.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">경력 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCareer(index)}
                      className="text-red-600 hover:text-red-700 min-h-[44px] min-w-[44px]"
                      aria-label="경력 제거"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>회사명</Label>
                      <Input
                        value={item.company}
                        onChange={(e) => updateCareer(index, 'company', e.target.value)}
                        placeholder="회사명"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>직책</Label>
                      <Input
                        value={item.position}
                        onChange={(e) => updateCareer(index, 'position', e.target.value)}
                        placeholder="직책"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>시작일</Label>
                      <Input
                        type="date"
                        value={item.start_date}
                        onChange={(e) => updateCareer(index, 'start_date', e.target.value)}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일</Label>
                      <Input
                        type="date"
                        value={item.end_date}
                        onChange={(e) => updateCareer(index, 'end_date', e.target.value)}
                        placeholder="재직 중이면 비워두세요"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>설명</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateCareer(index, 'description', e.target.value)}
                        placeholder="주요 업무 및 성과"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 학력 정보 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">학력 사항</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEducation}
            className="min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            학력 추가
          </Button>
        </div>

        {data.education.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              아직 등록된 학력이 없습니다. 학력을 추가해주세요.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.education.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">학력 {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEducation(index)}
                      className="text-red-600 hover:text-red-700 min-h-[44px] min-w-[44px]"
                      aria-label="학력 제거"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>학교명</Label>
                      <Input
                        value={item.school}
                        onChange={(e) => updateEducation(index, 'school', e.target.value)}
                        placeholder="학교명"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>전공</Label>
                      <Input
                        value={item.major}
                        onChange={(e) => updateEducation(index, 'major', e.target.value)}
                        placeholder="전공"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>학위</Label>
                      <Input
                        value={item.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        placeholder="학사, 석사, 박사 등"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>졸업년도</Label>
                      <Input
                        value={item.graduation_year}
                        onChange={(e) => updateEducation(index, 'graduation_year', e.target.value)}
                        placeholder="2024"
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 포트폴리오 */}
      <div className="space-y-2">
        <Label htmlFor="portfolio">포트폴리오 URL</Label>
        <Input
          id="portfolio"
          type="url"
          value={data.portfolio}
          onChange={(e) => onChange('portfolio', e.target.value)}
          placeholder="https://github.com/username 또는 https://portfolio.com"
          className="min-h-[44px]"
        />
        <p className="text-xs text-gray-500">
          GitHub, 포트폴리오 사이트, 개인 블로그 등
        </p>
      </div>

      {/* 상세 자기소개 */}
      <div className="space-y-2">
        <Label htmlFor="introduction">상세 자기소개</Label>
        <Textarea
          id="introduction"
          value={data.introduction}
          onChange={(e) => onChange('introduction', e.target.value)}
          placeholder="경력, 전문 분야, 주요 프로젝트, 성과 등을 상세히 작성해주세요."
          rows={6}
          maxLength={500}
        />
        <p className="text-xs text-gray-500">
          {data.introduction.length}/500자
        </p>
      </div>
    </div>
  )
}

