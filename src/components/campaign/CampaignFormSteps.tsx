'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CampaignType } from '@/types/supabase'
import { campaignSchema, CampaignInput, CAMPAIGN_TYPES, CAMPAIGN_CATEGORIES } from '@/lib/validations/campaign'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import KeywordInput from './KeywordInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface CampaignFormStepsProps {
  formData: any
  setFormData?: (data: any) => void
  errors: any
  register: any
  setValue: any
  watch: any
}

// Step 1: 기본 정보
export function CampaignBasicStep({ formData, errors, register, setValue, watch }: CampaignFormStepsProps) {
  const watchedType = watch('type')

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💡 <strong>빠른 시작:</strong> 기본 정보만 입력하면 바로 시작할 수 있습니다. 나중에 상세 정보를 추가할 수 있습니다.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            캠페인 제목 <span className="text-red-600">*</span>
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="예: 스타트업 성장 멘토링 요청"
            className={cn(errors.title && 'border-red-500', 'min-h-[44px]')}
            aria-describedby={errors.title ? 'title-error title-help' : 'title-help'}
            aria-invalid={errors.title ? 'true' : 'false'}
            aria-required="true"
          />
          <p id="title-help" className="text-xs text-gray-500">
            프로젝트의 핵심을 한 줄로 표현해주세요 (최소 5자)
          </p>
          {errors.title && (
            <p id="title-error" className="text-sm text-red-600" role="alert" aria-live="polite">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            간단한 설명 <span className="text-red-600">*</span>
            <span className="text-gray-500 text-xs ml-2">(1-2줄, 200자 이내)</span>
          </Label>
          <Textarea
            id="description"
            {...register('description')}
            rows={3}
            maxLength={200}
            placeholder="예: 초기 스타트업의 성장을 위한 멘토링을 받고 싶습니다. 스타트업 창업 및 성장 경험이 풍부한 전문가를 찾고 있습니다."
            className={cn(errors.description && 'border-red-500')}
            aria-describedby={errors.description ? 'description-error description-help' : 'description-help'}
            aria-invalid={errors.description ? 'true' : 'false'}
            aria-required="true"
          />
          <div className="flex justify-between items-center">
            <p id="description-help" className="text-xs text-gray-500">
              목적을 간단히 설명해주세요 (최소 20자)
            </p>
            <p className="text-xs text-gray-400">
              {formData.description?.length || 0}/200자
            </p>
          </div>
          {errors.description && (
            <p id="description-error" className="text-sm text-red-600" role="alert" aria-live="polite">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            캠페인 유형 <span className="text-red-600">*</span>
          </Label>
          <Select
            value={formData.type || 'mentoring'}
            onValueChange={(value) => setValue('type', value)}
          >
            <SelectTrigger className="min-h-[44px]" id="type">
              <SelectValue placeholder="유형 선택">
                {CAMPAIGN_TYPES.find(t => t.value === (formData.type || 'mentoring'))?.label || '유형 선택'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Step 2: 상세 정보
export function CampaignDetailsStep({ formData, errors, register, setValue, watch }: CampaignFormStepsProps) {
  const watchedType = watch('type')

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          ✨ <strong>상세 정보:</strong> 더 자세한 정보를 입력하면 더 정확한 매칭이 가능합니다.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description-full">
            상세 설명 <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="description-full"
            {...register('description')}
            rows={6}
            placeholder="예시:&#10;&#10;프로젝트 목적:&#10;- 비즈니스 모델 검증 및 개선&#10;- 시장 진입 전략 수립&#10;- 팀 구성 및 조직 운영 조언&#10;&#10;요구사항:&#10;- 스타트업 창업 및 성장 경험 5년 이상&#10;- 주 1회 2시간 멘토링 세션&#10;&#10;예상 기간: 3개월"
            className={cn(errors.description && 'border-red-500')}
            aria-describedby="description-full-help"
          />
          <p id="description-full-help" className="text-xs text-gray-500">
            목적, 요구사항, 예상 기간 등을 포함해주세요 (최소 20자)
          </p>
          {errors.description && (
            <p className="text-sm text-red-600" role="alert">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budgetMin">최소 예산 (원)</Label>
            <Input
              id="budgetMin"
              type="number"
              {...register('budgetMin', {
                setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))
              })}
              placeholder="1000000"
              className={cn(errors.budgetMin && 'border-red-500', 'min-h-[44px]')}
            />
            {errors.budgetMin && (
              <p className="text-sm text-red-600">{errors.budgetMin.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetMax">최대 예산 (원)</Label>
            <Input
              id="budgetMax"
              type="number"
              {...register('budgetMax', {
                setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))
              })}
              placeholder="5000000"
              className={cn(errors.budgetMax && 'border-red-500', 'min-h-[44px]')}
            />
            {errors.budgetMax && (
              <p className="text-sm text-red-600">{errors.budgetMax.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">시작일</Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
              className={cn(errors.startDate && 'border-red-500', 'min-h-[44px]')}
            />
            {errors.startDate && (
              <p className="text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">종료일</Label>
            <Input
              id="endDate"
              type="date"
              {...register('endDate')}
              className={cn(errors.endDate && 'border-red-500', 'min-h-[44px]')}
            />
            {errors.endDate && (
              <p className="text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 3: 추가 정보
export function CampaignAdditionalStep({ formData, errors, register, setValue, watch }: CampaignFormStepsProps) {
  const watchedType = watch('type')
  const watchedKeywords = watch('keywords')

  const handleKeywordChange = (keywords: string[]) => {
    setValue('keywords', keywords)
  }

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-purple-800">
          🔍 <strong>추가 정보:</strong> 키워드와 위치 정보를 추가하면 더 정확한 매칭이 가능합니다. (선택사항)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">
            카테고리 <span className="text-gray-500 text-xs">(선택사항)</span>
          </Label>
          <Select
            value={formData.category || ''}
            onValueChange={(value) => setValue('category', value || undefined)}
          >
            <SelectTrigger className="min-h-[44px]" id="category">
              <SelectValue placeholder="카테고리 선택 (선택사항)">
                {formData.category || '카테고리 선택 (선택사항)'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">카테고리 선택 (선택사항)</SelectItem>
              {watchedType && CAMPAIGN_CATEGORIES[watchedType as keyof typeof CAMPAIGN_CATEGORIES]?.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
          {!formData.category && (
            <p className="text-xs text-gray-500">
              카테고리를 선택하면 더 정확한 매칭이 가능합니다 (선택사항)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            키워드 <span className="text-gray-500 text-xs">(선택사항)</span>
          </Label>
          <KeywordInput
            keywords={watchedKeywords || []}
            onChange={handleKeywordChange}
          />
          {errors.keywords && (
            <p className="text-sm text-red-600">{errors.keywords.message}</p>
          )}
          {(!watchedKeywords || watchedKeywords.length === 0) && !errors.keywords && (
            <p className="text-xs text-gray-500">
              키워드를 추가하면 더 정확한 매칭이 가능합니다 (선택사항)
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">지역</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="예: 서울시 강남구, 경기도 성남시, 전국, 원격"
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredExperts">필요 전문가 수</Label>
            <Input
              id="requiredExperts"
              type="number"
              {...register('requiredExperts', {
                setValueAs: (v: unknown) => {
                  if (v === '' || v === null || v === undefined) return undefined
                  const n = Number(v)
                  return Number.isFinite(n) ? n : undefined
                }
              })}
              placeholder="1"
              min={1}
              className={cn(errors.requiredExperts && 'border-red-500', 'min-h-[44px]')}
            />
            {errors.requiredExperts && (
              <p className="text-sm text-red-600">{errors.requiredExperts.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

