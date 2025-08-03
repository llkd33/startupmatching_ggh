'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { CampaignType } from '@/types/supabase'
import { campaignSchema, CampaignInput, CAMPAIGN_TYPES, CAMPAIGN_CATEGORIES } from '@/lib/validations/campaign'
import CampaignTypeSelector from './CampaignTypeSelector'
import FileUploader from './FileUploader'
import KeywordInput from './KeywordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CampaignFormProps {
  organizationId: string
  initialData?: any
}

export default function CampaignForm({ organizationId, initialData }: CampaignFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<any[]>(initialData?.attachments || [])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || 'mentoring',
      category: initialData?.category || '',
      keywords: initialData?.keywords || [],
      budgetMin: initialData?.budget_min || undefined,
      budgetMax: initialData?.budget_max || undefined,
      startDate: initialData?.start_date || undefined,
      endDate: initialData?.end_date || undefined,
      location: initialData?.location || '',
      requiredExperts: initialData?.required_experts || 1,
    }
  })

  const watchedType = watch('type')
  const watchedKeywords = watch('keywords')

  const onSubmit = async (data: CampaignInput, isDraft = false) => {
    setSubmitError(null)

    try {
      const campaignData = {
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        keywords: data.keywords,
        budget_min: data.budgetMin || null,
        budget_max: data.budgetMax || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        location: data.location || null,
        required_experts: data.requiredExperts,
        organization_id: organizationId,
        attachments,
        status: isDraft ? 'draft' : 'active'
      }

      if (initialData?.id) {
        // Update existing campaign
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', initialData.id)
        
        if (error) throw error
      } else {
        // Create new campaign
        const { data: newCampaign, error } = await supabase
          .from('campaigns')
          .insert([campaignData])
          .select()
          .single()
        
        if (error) throw error
      }

      router.push('/dashboard/campaigns')
    } catch (err: any) {
      setSubmitError(err.message || '캠페인 저장 중 오류가 발생했습니다.')
    }
  }

  const handleKeywordChange = (keywords: string[]) => {
    setValue('keywords', keywords)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>
              캠페인의 기본 정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="title">캠페인 제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="예: React 전문가 멘토링 요청"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">상세 설명 *</Label>
              <Textarea
                id="description"
                {...register('description')}
                rows={4}
                placeholder="캠페인의 목적, 요구사항 등을 자세히 설명해주세요."
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">캠페인 유형 *</Label>
              <select
                id="type"
                {...register('type')}
                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  errors.type ? 'border-red-500' : ''
                }`}
              >
                {CAMPAIGN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">카테고리 *</Label>
              <select
                id="category"
                {...register('category')}
                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  errors.category ? 'border-red-500' : ''
                }`}
              >
                <option value="">카테고리 선택</option>
                {CAMPAIGN_CATEGORIES[watchedType]?.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <Label>키워드 *</Label>
              <KeywordInput
                keywords={watchedKeywords}
                onChange={handleKeywordChange}
              />
              {errors.keywords && (
                <p className="text-sm text-red-600 mt-1">{errors.keywords.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget and Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>예산 및 일정</CardTitle>
            <CardDescription>
              예산 범위와 프로젝트 일정을 설정해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budgetMin">최소 예산 (원)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  {...register('budgetMin', { valueAsNumber: true })}
                  placeholder="1000000"
                  className={errors.budgetMin ? 'border-red-500' : ''}
                />
                {errors.budgetMin && (
                  <p className="text-sm text-red-600 mt-1">{errors.budgetMin.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="budgetMax">최대 예산 (원)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  {...register('budgetMax', { valueAsNumber: true })}
                  placeholder="5000000"
                  className={errors.budgetMax ? 'border-red-500' : ''}
                />
                {errors.budgetMax && (
                  <p className="text-sm text-red-600 mt-1">{errors.budgetMax.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">지역</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="예: 서울"
                />
              </div>

              <div>
                <Label htmlFor="requiredExperts">필요 전문가 수 *</Label>
                <Input
                  id="requiredExperts"
                  type="number"
                  min="1"
                  {...register('requiredExperts', { valueAsNumber: true })}
                  className={errors.requiredExperts ? 'border-red-500' : ''}
                />
                {errors.requiredExperts && (
                  <p className="text-sm text-red-600 mt-1">{errors.requiredExperts.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>첨부 파일</CardTitle>
            <CardDescription>
              관련 문서나 참고 자료를 업로드해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              attachments={attachments}
              onChange={setAttachments}
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/campaigns')}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSubmit((data) => onSubmit(data, true))}
            disabled={isSubmitting}
          >
            임시 저장
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '캠페인 게시'}
          </Button>
        </div>
      </form>
    </div>
  )
}