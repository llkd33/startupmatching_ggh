'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickProfileStepProps {
  data: {
    name: string
    phone: string
    bio: string
    skills: string[]
  }
  onChange: (field: string, value: string | string[]) => void
  errors?: Record<string, string>
}

export function QuickProfileStep({ data, onChange, errors = {} }: QuickProfileStepProps) {
  const popularSkills = [
    'React', 'TypeScript', 'Node.js', 'Python', 'Next.js',
    'UI/UX 디자인', '마케팅', '비즈니스 컨설팅', '데이터 분석', '프로젝트 관리'
  ]

  const addSkill = (skill: string) => {
    if (data.skills.length >= 3) return
    if (data.skills.includes(skill)) return
    onChange('skills', [...data.skills, skill])
  }

  const removeSkill = (skill: string) => {
    onChange('skills', data.skills.filter(s => s !== skill))
  }

  const handleNewSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault()
      const newSkill = e.currentTarget.value.trim()
      if (data.skills.length < 3 && !data.skills.includes(newSkill)) {
        onChange('skills', [...data.skills, newSkill])
        e.currentTarget.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💡 <strong>빠른 시작:</strong> 필수 정보만 입력하면 바로 시작할 수 있습니다. 나중에 상세 정보를 추가할 수 있습니다.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            이름 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="홍길동"
            className={cn(
              errors.name && "border-red-500 focus:ring-red-500",
              "min-h-[44px]"
            )}
            required
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            전화번호 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="010-1234-5678"
            className={cn(
              errors.phone && "border-red-500 focus:ring-red-500",
              "min-h-[44px]"
            )}
            required
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">
            간단한 자기소개 <span className="text-red-600">*</span>
            <span className="text-gray-500 text-xs ml-2">(1-2줄, 100자 이내)</span>
          </Label>
          <Textarea
            id="bio"
            value={data.bio}
            onChange={(e) => onChange('bio', e.target.value)}
            placeholder="예: React 전문 개발자로 5년간 경력이 있으며, 스타트업 개발 경험이 풍부합니다."
            rows={3}
            maxLength={100}
            className={cn(
              errors.bio && "border-red-500 focus:ring-red-500"
            )}
            required
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {data.bio.length}/100자
            </p>
            {errors.bio && (
              <p className="text-sm text-red-600">{errors.bio}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skills">
            주요 스킬 <span className="text-red-600">*</span>
            <span className="text-gray-500 text-xs ml-2">(최대 3개)</span>
          </Label>
          
          {/* 선택된 스킬 태그 */}
          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`${skill} 제거`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 인기 스킬 추천 */}
          {data.skills.length < 3 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">인기 스킬에서 선택하거나 직접 입력하세요:</p>
              <div className="flex flex-wrap gap-2">
                {popularSkills
                  .filter(skill => !data.skills.includes(skill))
                  .slice(0, 5)
                  .map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors min-h-[44px]"
                    >
                      + {skill}
                    </button>
                  ))}
              </div>
              
              <Input
                placeholder="직접 입력 (엔터키로 추가)"
                onKeyDown={handleNewSkill}
                className="min-h-[44px]"
                disabled={data.skills.length >= 3}
              />
            </div>
          )}

          {errors.skills && (
            <p className="text-sm text-red-600">{errors.skills}</p>
          )}
        </div>
      </div>
    </div>
  )
}

