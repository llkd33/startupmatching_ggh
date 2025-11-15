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
import { MultiStepWizard } from '@/components/ui/multi-step-wizard'
import CampaignTemplateSelector, { CampaignTemplate } from './CampaignTemplateSelector'
import { CampaignBasicStep, CampaignDetailsStep, CampaignAdditionalStep } from './CampaignFormSteps'
import FileUploader from './FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [showTemplateSelector, setShowTemplateSelector] = useState(!initialData?.id && !initialData?.title) // 새 캠페인만 템플릿 선택
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null)
  const [savedStep, setSavedStep] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    trigger
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || 'mentoring',
      category: initialData?.category || undefined,
      keywords: initialData?.keywords || undefined,
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
  const watchedCategory = watch('category')

  // 유형 변경 시 카테고리 초기화
  useEffect(() => {
    if (watchedType && watchedCategory) {
      const availableCategories = CAMPAIGN_CATEGORIES[watchedType as keyof typeof CAMPAIGN_CATEGORIES] || []
      // 현재 카테고리가 새로운 유형에 없으면 초기화
      if (!availableCategories.includes(watchedCategory)) {
        setValue('category', undefined)
      }
    }
  }, [watchedType, watchedCategory, setValue])

  // 자동 저장 설정
  const autoSaveKey = initialData?.id
    ? `campaign-draft-${initialData.id}`
    : `campaign-draft-new-${organizationId}`

  const { save, restore, clear, state: autoSaveState } = useAutoSave<CampaignInput & { attachments: any[] }>({
    key: autoSaveKey,
    delay: 3000, // 3초 후 자동 저장
    enabled: !initialData?.id && !showTemplateSelector, // 템플릿 선택 후에만 자동 저장
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

    // 저장된 단계 복구
    const saved = localStorage.getItem(`campaign-step-${organizationId}`)
    if (saved) {
      setSavedStep(parseInt(saved))
      setShowTemplateSelector(false) // 저장된 단계가 있으면 템플릿 선택 건너뛰기
    }
  }, [autoSaveKey, initialData?.id, organizationId])

  // 폼 데이터 변경 시 자동 저장
  useEffect(() => {
    if (initialData?.id) return // 수정 모드에서는 자동 저장 안 함
    if (showTemplateSelector) return // 템플릿 선택 중에는 저장 안 함
    if (!watchedFormData.title && !watchedFormData.description) return // 빈 폼은 저장 안 함

    save({
      ...watchedFormData,
      attachments
    })
  }, [watchedFormData, attachments, save, initialData?.id, showTemplateSelector])

  // 브라우저 뒤로가기/새로고침 시 저장되지 않은 변경사항 경고
  useEffect(() => {
    if (initialData?.id) return // 수정 모드에서는 경고 안 함
    
    const hasUnsavedChanges = watchedFormData.title || watchedFormData.description
    
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [watchedFormData, initialData?.id])

  // 템플릿 선택 시 폼 데이터 채우기
  const handleTemplateSelect = (template: CampaignTemplate | null) => {
    if (template && template.id) {
      setValue('title', template.title)
      setValue('description', template.description)
      setValue('type', template.type)
      setValue('category', template.category)
      setValue('keywords', template.keywords)
      setSelectedTemplate(template)
    }
    setShowTemplateSelector(false)
  }

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
      setShowTemplateSelector(false)
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
    // 중복 제출 방지
    if (loading || isSubmitting) {
      return
    }

    setSubmitError(null)
    setLoading(true)

    let newCampaign: any = null

    try {
      const campaignData = {
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category || null,
        keywords: data.keywords || [],
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
        const { data: createdCampaign, error } = await supabase
          .from('campaigns')
          .insert([campaignData])
          .select()
          .single()

        if (error) throw error

        newCampaign = createdCampaign

        // 자동 매칭 및 알림 발송 (비동기, 백그라운드)
        if (newCampaign && !isDraft) {
          toast.success('캠페인이 게시되었습니다!', {
            description: '매칭되는 전문가들에게 알림을 보내는 중입니다...',
            duration: 5000
          })

          // 백그라운드에서 매칭 처리
          handleCampaignCreated(newCampaign.id).catch(error => {
            if (process.env.NODE_ENV === 'development') {
            console.error('Failed to process campaign matching:', error)
            }
            // 매칭 실패해도 캠페인은 성공적으로 생성됨
          })
        } else {
          toast.success('캠페인이 임시 저장되었습니다.')
        }
      }

      // 성공 시 임시 저장 데이터 삭제
      clear()
      localStorage.removeItem(`campaign-step-${organizationId}`)

      // 새로 생성된 캠페인 페이지로 리다이렉트
      if (!initialData?.id && newCampaign) {
        router.push(`/dashboard/campaigns/${newCampaign.id}`)
      } else {
        router.push('/dashboard/campaigns')
      }
    } catch (err: any) {
      const errorMessage = err.message || '캠페인 저장 중 오류가 발생했습니다.'
      
      // 더 친절한 에러 메시지로 변환
      let friendlyMessage = errorMessage
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        friendlyMessage = '이미 동일한 제목의 캠페인이 존재합니다. 제목을 변경해주세요.'
      } else if (errorMessage.includes('permission') || errorMessage.includes('권한')) {
        friendlyMessage = '캠페인을 저장할 권한이 없습니다. 로그인 상태를 확인해주세요.'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        friendlyMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'
      }
      
      setSubmitError(friendlyMessage)
      toast.error(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  // Step 1 검증: 기본 정보
  const validateStep1 = async () => {
    const isValid = await trigger(['title', 'description', 'type'])
    return isValid
  }

  // Step 2 검증: 상세 정보 (선택사항이므로 항상 통과)
  const validateStep2 = async () => {
    return true
  }

  // Step 3 검증: 추가 정보 (선택사항이므로 항상 통과)
  const validateStep3 = async () => {
    return true
  }

  const saveProgress = async (currentStep: number) => {
    localStorage.setItem(`campaign-step-${organizationId}`, currentStep.toString())
    
    // 폼 데이터 저장
    if (!initialData?.id) {
      save({
        ...watchedFormData,
        attachments
      })
    }
  }

  const wizardSteps = [
    {
      id: 'basic',
      title: '기본 정보',
      description: '필수 정보만 입력하면 바로 시작할 수 있습니다 (약 2분)',
      component: (
        <CampaignBasicStep
          formData={watchedFormData}
          setFormData={(data) => {
            Object.entries(data).forEach(([key, value]) => {
              setValue(key as keyof CampaignInput, value)
            })
          }}
          errors={errors}
          register={register}
          setValue={setValue}
          watch={watch}
        />
      ),
      validation: validateStep1
    },
    {
      id: 'details',
      title: '상세 정보',
      description: '더 자세한 정보를 입력하면 더 정확한 매칭이 가능합니다',
      component: (
        <CampaignDetailsStep
          formData={watchedFormData}
          setFormData={(data) => {
            Object.entries(data).forEach(([key, value]) => {
              setValue(key as keyof CampaignInput, value)
            })
          }}
          errors={errors}
          register={register}
          setValue={setValue}
          watch={watch}
        />
      ),
      validation: validateStep2
    },
    {
      id: 'additional',
      title: '추가 정보',
      description: '키워드와 위치 정보를 추가하면 더 정확한 매칭이 가능합니다 (선택사항)',
      component: (
        <div className="space-y-6">
          <CampaignAdditionalStep
            formData={watchedFormData}
            setFormData={(data) => {
              Object.entries(data).forEach(([key, value]) => {
                setValue(key as keyof CampaignInput, value)
              })
            }}
            errors={errors}
            register={register}
            setValue={setValue}
            watch={watch}
          />
          
          {/* 첨부 파일 */}
          <Card>
            <CardHeader>
              <CardTitle>첨부 파일</CardTitle>
              <CardDescription>
                관련 문서나 참고 자료를 업로드해주세요. (선택사항)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader
                attachments={attachments}
                onChange={setAttachments}
              />
            </CardContent>
          </Card>
        </div>
      ),
      validation: validateStep3
    }
  ]

  // 템플릿 선택 화면
  if (showTemplateSelector) {
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

        <Card>
          <CardHeader>
            <CardTitle>캠페인 생성</CardTitle>
            <CardDescription>
              템플릿을 선택하거나 직접 작성할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignTemplateSelector onSelect={handleTemplateSelect} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 자동 저장 상태 표시 */}
      {!initialData?.id && (
        <div className="flex justify-end">
          <AutoSaveIndicator
            isSaving={autoSaveState.isSaving}
            lastSaved={autoSaveState.lastSaved}
          />
        </div>
      )}

      {/* 에러 표시 */}
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

      <Card>
        <CardHeader>
          <CardTitle>캠페인 생성</CardTitle>
          <CardDescription>
            {initialData?.id ? '캠페인을 수정합니다.' : '단계별로 캠페인 정보를 입력해주세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
            <MultiStepWizard
              steps={wizardSteps}
              onComplete={async () => {
                // 중복 제출 방지
                if (loading || isSubmitting) {
                  return
                }
                
                const isValid = await trigger()
                if (isValid) {
                  const formData = watch()
                  await onSubmit(formData, false)
                } else {
                  // Validation 실패 시 에러 표시
                  setSubmitError('필수 정보를 모두 입력해주세요.')
                  toast.error('입력한 정보를 확인해주세요.', {
                    description: '필수 항목이 누락되었습니다.'
                  })
                }
              }}
              onSaveProgress={saveProgress}
              initialStep={savedStep}
              showProgressBar={true}
              allowNavigation={true}
              allowSkip={false}
            />

            {/* 폼 액션 버튼 (마지막 단계에서만 표시) */}
            <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!loading && !isSubmitting) {
                router.push('/dashboard/campaigns')
              }
            }}
            disabled={isSubmitting || loading}
            className="min-h-[44px]"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              // 임시 저장은 validation 없이 진행
              if (loading || isSubmitting) return
              
              const formData = watch()
              await onSubmit(formData, true)
            }}
            disabled={isSubmitting || loading}
            className="min-h-[44px]"
          >
            임시 저장
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            isLoading={isSubmitting || loading}
            className="min-h-[44px]"
          >
            {isSubmitting || loading ? '저장 중...' : '캠페인 게시'}
          </Button>
        </div>
      </form>
        </CardContent>
      </Card>
    </div>
  )
}
