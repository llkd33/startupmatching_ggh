'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { CampaignType } from '@/types/supabase'
import { campaignSchema, CampaignInput, CAMPAIGN_TYPES, CAMPAIGN_CATEGORIES } from '@/lib/validations/campaign'
import { handleCampaignCreated } from '@/lib/campaign-matching'
import { useAutoSave, getDraftMetadata } from '@/hooks/useAutoSave'
import CampaignTypeSelector from './CampaignTypeSelector'
import FileUploader from './FileUploader'
import KeywordInput from './KeywordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/toast-custom'
import { AutoSaveIndicator, DraftRestorePrompt } from '@/components/ui/auto-save-indicator'

interface CampaignFormProps {
  organizationId: string
  initialData?: any
}

export default function CampaignForm({ organizationId, initialData }: CampaignFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<any[]>(initialData?.attachments || [])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [draftMetadata, setDraftMetadata] = useState<{ timestamp: string } | null>(null)

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
  const watchedFormData = watch()

  // 자동 저장 설정
  const autoSaveKey = initialData?.id
    ? `campaign-draft-${initialData.id}`
    : `campaign-draft-new-${organizationId}`

  const { save, restore, clear, state: autoSaveState } = useAutoSave<CampaignInput & { attachments: any[] }>({
    key: autoSaveKey,
    delay: 3000, // 3초 후 자동 저장
    enabled: !initialData?.id, // 새 캠페인만 자동 저장 (수정 시에는 비활성화)
    onSave: () => {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('Campaign draft auto-saved')
      }
    }
  })

  // 초기 마운트 시 임시 저장 데이터 확인
  useEffect(() => {
    if (initialData?.id) return // 수정 모드에서는 임시 저장 복구 안 함

    const metadata = getDraftMetadata(autoSaveKey)
    if (metadata) {
      setDraftMetadata(metadata)
      setShowDraftPrompt(true)
    }
  }, [autoSaveKey, initialData?.id])

  // 폼 데이터 변경 시 자동 저장
  useEffect(() => {
    if (initialData?.id) return // 수정 모드에서는 자동 저장 안 함
    if (!watchedFormData.title && !watchedFormData.description) return // 빈 폼은 저장 안 함

    save({
      ...watchedFormData,
      attachments
    })
  }, [watchedFormData, attachments, save, initialData?.id])

  // 임시 저장 데이터 복구
  const handleRestoreDraft = () => {
    const restoredData = restore()
    if (restoredData) {
      // 폼 데이터 복원
      Object.entries(restoredData).forEach(([key, value]) => {
        if (key === 'attachments') {
          setAttachments(value as any[])
        } else if (key !== 'attachments') {
          setValue(key as keyof CampaignInput, value)
        }
      })
      toast.success('임시 저장된 데이터를 불러왔습니다')
    }
    setShowDraftPrompt(false)
  }

  // 임시 저장 데이터 삭제하고 새로 시작
  const handleDiscardDraft = () => {
    clear()
    setShowDraftPrompt(false)
    toast.info('새로 작성합니다')
  }

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

        toast.success('캠페인이 수정되었습니다.')
      } else {
        // Create new campaign
        const { data: newCampaign, error } = await supabase
          .from('campaigns')
          .insert([campaignData])
          .select()
          .single()

        if (error) throw error

        // 자동 매칭 및 알림 발송 (비동기, 백그라운드)
        if (newCampaign && !isDraft) {
          toast.success('캠페인이 게시되었습니다. 매칭되는 전문가들에게 알림을 보내는 중입니다...')

          // 백그라운드에서 매칭 처리
          handleCampaignCreated(newCampaign.id).catch(error => {
            console.error('Failed to process campaign matching:', error)
            // 매칭 실패해도 캠페인은 성공적으로 생성됨
          })
        } else {
          toast.success('캠페인이 임시 저장되었습니다.')
        }
      }

      // 성공 시 임시 저장 데이터 삭제
      clear()

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
      {/* 임시 저장 데이터 복구 프롬프트 */}
      {showDraftPrompt && draftMetadata && (
        <DraftRestorePrompt
          draftTimestamp={draftMetadata.timestamp}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {/* 자동 저장 상태 표시 */}
      {!initialData?.id && (
        <div className="flex justify-end">
          <AutoSaveIndicator
            isSaving={autoSaveState.isSaving}
            lastSaved={autoSaveState.lastSaved}
          />
        </div>
      )}

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
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="title">캠페인 제목 *</Label>
                <span className="text-xs text-gray-500" title="명확하고 구체적인 제목이 더 많은 전문가의 관심을 끕니다">
                  💡 예: "React 전문가 멘토링 요청" 또는 "마케팅 전략 컨설팅"
                </span>
              </div>
              <Input
                id="title"
                {...register('title')}
                placeholder="예: React 전문가 멘토링 요청"
                className={errors.title ? 'border-red-500' : ''}
                aria-describedby="title-help"
              />
              <p id="title-help" className="text-xs text-gray-500 mt-1">
                프로젝트의 핵심을 한 줄로 표현해주세요 (최소 5자)
              </p>
              {errors.title && (
                <p className="text-sm text-red-600 mt-1" role="alert">{errors.title.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="description">상세 설명 *</Label>
                <span className="text-xs text-gray-500">
                  💡 구체적일수록 좋은 전문가와 매칭됩니다
                </span>
              </div>
              <Textarea
                id="description"
                {...register('description')}
                rows={6}
                placeholder="예시:&#10;&#10;프로젝트 목적:&#10;- React 기반 웹 애플리케이션 개발 멘토링&#10;- 코드 리뷰 및 베스트 프랙티스 공유&#10;&#10;요구사항:&#10;- 5년 이상 React 개발 경력&#10;- 주 1회 2시간 멘토링&#10;&#10;예상 기간: 3개월"
                className={errors.description ? 'border-red-500' : ''}
                aria-describedby="description-help"
              />
              <p id="description-help" className="text-xs text-gray-500 mt-1">
                목적, 요구사항, 예상 기간 등을 포함해주세요 (최소 20자)
              </p>
              {errors.description && (
                <p className="text-sm text-red-600 mt-1" role="alert">{errors.description.message}</p>
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