'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useAutoSave, getDraftMetadata } from '@/hooks/useAutoSave'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AutoSaveIndicator, DraftRestorePrompt } from '@/components/ui/auto-save-indicator'
import { CalendarIcon, CurrencyDollarIcon, LinkIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface ProposalFormProps {
  campaignId: string
  expertId: string
  campaignData?: any
}

export default function ProposalForm({ campaignId, expertId, campaignData }: ProposalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([])
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [draftMetadata, setDraftMetadata] = useState<{ timestamp: string } | null>(null)
  
  // 자동 저장 설정
  const autoSaveKey = `proposal-draft-${campaignId}-${expertId}`
  
  const { save, restore, clear, state: autoSaveState } = useAutoSave<{
    proposal_text: string
    estimated_start_date: string
    estimated_end_date: string
    portfolio_links: string[]
  }>({
    key: autoSaveKey,
    delay: 3000, // 3초 후 자동 저장
    enabled: true,
    onSave: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Proposal draft auto-saved')
      }
    }
  })

  // 초기 마운트 시 임시 저장 데이터 확인
  useEffect(() => {
    const metadata = getDraftMetadata(autoSaveKey)
    if (metadata) {
      setDraftMetadata(metadata)
      setShowDraftPrompt(true)
    }
  }, [autoSaveKey])
  
  // Form validation
  const {
    values: formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAllFields,
    setValue
  } = useFormValidation(
    {
      proposal_text: '',
      estimated_start_date: '',
      estimated_end_date: '',
    },
    {
      proposal_text: { required: true, minLength: 50 },
      estimated_start_date: {
        custom: async (value, allValues) => {
          if (value && allValues.estimated_end_date) {
            const startDate = new Date(value)
            const endDate = new Date(allValues.estimated_end_date)
            if (startDate > endDate) {
              return '시작일은 완료일보다 이전이어야 합니다.'
            }
          }
          return null
        }
      },
      estimated_end_date: {
        custom: async (value, allValues) => {
          if (value && allValues.estimated_start_date) {
            const startDate = new Date(allValues.estimated_start_date)
            const endDate = new Date(value)
            if (endDate < startDate) {
              return '완료일은 시작일보다 이후여야 합니다.'
            }
          }
          return null
        }
      },
    },
    { mode: 'onBlur', reValidateMode: 'onChange' }
  )

  // 폼 데이터 변경 시 자동 저장
  useEffect(() => {
    if (!formData.proposal_text && !formData.estimated_start_date) {
      return // 빈 폼은 저장 안 함
    }

    save({
      proposal_text: formData.proposal_text,
      estimated_start_date: formData.estimated_start_date,
      estimated_end_date: formData.estimated_end_date,
      portfolio_links: portfolioLinks,
    })
  }, [formData, portfolioLinks, save])

  // 임시 저장 데이터 복구
  const handleRestoreDraft = () => {
    const restoredData = restore()
    if (restoredData) {
      setValue('proposal_text', restoredData.proposal_text || '')
      setValue('estimated_start_date', restoredData.estimated_start_date || '')
      setValue('estimated_end_date', restoredData.estimated_end_date || '')
      setPortfolioLinks(restoredData.portfolio_links || [])
      toast.success('임시 저장된 데이터를 불러왔습니다')
      setShowDraftPrompt(false)
    }
  }

  // 임시 저장 데이터 삭제하고 새로 시작
  const handleDiscardDraft = () => {
    clear()
    setShowDraftPrompt(false)
    toast.info('새로 작성합니다')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validate all fields
    const isValid = await validateAllFields()
    if (!isValid) {
      toast.error('입력 정보를 확인해주세요.')
      setLoading(false)
      return
    }

    try {
      const proposalData = {
        campaign_id: campaignId,
        expert_id: expertId,
      proposal_text: formData.proposal_text,
      estimated_budget: null, // 기관에서 설정한 금액 사용
      estimated_start_date: formData.estimated_start_date || null,
      estimated_end_date: formData.estimated_end_date || null,
      portfolio_links: portfolioLinks,
      }

      const { error } = await supabase
        .from('proposals')
        .insert(proposalData as any)

      if (error) throw error

      // 성공 시 임시 저장 데이터 삭제
      clear()
      localStorage.removeItem(autoSaveKey)

      toast.success('제안서가 성공적으로 제출되었습니다.')
      router.push('/dashboard/proposals')
    } catch (err: any) {
      toast.error(err.message || '제안서 제출 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const addPortfolioLink = () => {
    if (!newLink.trim()) return

    try {
      new URL(newLink)
      setPortfolioLinks(prev => [...prev, newLink])
      setNewLink('')
      toast.success('포트폴리오 링크가 추가되었습니다.')
    } catch {
      toast.error('올바른 URL을 입력해주세요.')
    }
  }

  const removeLink = (index: number) => {
    setPortfolioLinks(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {/* 자동 저장 인디케이터 */}
      <AutoSaveIndicator
        isSaving={autoSaveState.isSaving}
        lastSaved={autoSaveState.lastSaved}
        className="mb-4"
      />

      {/* 임시 저장 복구 프롬프트 */}
      {showDraftPrompt && draftMetadata && (
        <DraftRestorePrompt
          draftTimestamp={draftMetadata.timestamp}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          className="mb-4"
        />
      )}

      {campaignData && (
        <div className="bg-gray-50 px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {campaignData.title}
          </h3>
          <p className="text-sm text-gray-600">
            {campaignData.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {campaignData.start_date} ~ {campaignData.end_date}
            </div>
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
              예산: {campaignData.budget_min?.toLocaleString()} ~ {campaignData.budget_max?.toLocaleString()}원
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="proposal_text" className="block text-sm font-medium text-gray-700">
              제안 내용 <span className="text-red-500">*</span>
            </Label>
            <p className="mt-1 text-sm text-gray-500">
              비즈니스 모델, 시장 진입 전략, 성장 방안 등 멘토링 제안 내용을 자세히 작성해주세요. (최소 50자)
            </p>
            <Textarea
              id="proposal_text"
              rows={8}
              value={formData.proposal_text}
              onChange={(e) => handleChange('proposal_text', e.target.value)}
              onBlur={() => handleBlur('proposal_text')}
              required
              className={`mt-2 min-h-[44px] text-base ${touched.proposal_text && errors.proposal_text ? 'border-red-500' : ''}`}
              placeholder="안녕하세요. 저는 스타트업 창업 및 성장 경험이 풍부한 멘토로서..."
              aria-invalid={touched.proposal_text && !!errors.proposal_text}
              aria-describedby={touched.proposal_text && errors.proposal_text ? 'proposal_text-error' : 'proposal_text-help'}
            />
            <div className="flex justify-between items-center mt-1">
              <p id="proposal_text-help" className="text-xs text-gray-500">
                {formData.proposal_text.length}/최소 50자
              </p>
              {formData.proposal_text.length >= 50 && !errors.proposal_text && (
                <p className="text-xs text-green-600">✓ 충분한 길이입니다</p>
              )}
            </div>
            {touched.proposal_text && errors.proposal_text && (
              <p id="proposal_text-error" className="text-sm text-red-600 mt-1" role="alert">
                {errors.proposal_text}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="estimated_start_date" className="block text-sm font-medium text-gray-700">
                  시작 가능일
                </Label>
                <Input
                  type="date"
                  id="estimated_start_date"
                  value={formData.estimated_start_date}
                  onChange={(e) => handleChange('estimated_start_date', e.target.value)}
                  onBlur={() => handleBlur('estimated_start_date')}
                  className={`mt-1 h-12 text-base ${touched.estimated_start_date && errors.estimated_start_date ? 'border-red-500' : ''}`}
                  aria-invalid={touched.estimated_start_date && !!errors.estimated_start_date}
                  aria-describedby={touched.estimated_start_date && errors.estimated_start_date ? 'estimated_start_date-error' : undefined}
                />
                {touched.estimated_start_date && errors.estimated_start_date && (
                  <p id="estimated_start_date-error" className="text-sm text-red-600 mt-1" role="alert">
                    {errors.estimated_start_date}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="estimated_end_date" className="block text-sm font-medium text-gray-700">
                  완료 예정일
                </Label>
                <Input
                  type="date"
                  id="estimated_end_date"
                  value={formData.estimated_end_date}
                  onChange={(e) => handleChange('estimated_end_date', e.target.value)}
                  onBlur={() => handleBlur('estimated_end_date')}
                  className={`mt-1 h-12 text-base ${touched.estimated_end_date && errors.estimated_end_date ? 'border-red-500' : formData.estimated_end_date && formData.estimated_start_date && new Date(formData.estimated_end_date) >= new Date(formData.estimated_start_date) ? 'border-green-500' : ''}`}
                  aria-invalid={touched.estimated_end_date && !!errors.estimated_end_date}
                  aria-describedby={touched.estimated_end_date && errors.estimated_end_date ? 'estimated_end_date-error' : undefined}
                />
                {touched.estimated_end_date && errors.estimated_end_date && (
                  <p id="estimated_end_date-error" className="text-sm text-red-600 mt-1" role="alert">
                    {errors.estimated_end_date}
                  </p>
                )}
                {formData.estimated_end_date && formData.estimated_start_date && new Date(formData.estimated_end_date) >= new Date(formData.estimated_start_date) && !errors.estimated_end_date && (
                  <p className="text-sm text-green-600 mt-1">✓ 날짜 범위가 올바릅니다</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700">
              포트폴리오 링크
            </Label>
            <p className="mt-1 text-sm text-gray-500">
              관련 프로젝트나 포트폴리오 링크를 추가해주세요.
            </p>
            
            {portfolioLinks.length > 0 && (
              <div className="mt-2 space-y-2">
                {portfolioLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <LinkIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-indigo-600 hover:text-indigo-500 truncate"
                    >
                      {link}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLink(index)}
                      className="text-sm text-red-600 hover:text-red-500 min-h-[44px] min-w-[44px]"
                      aria-label={`${link} 링크 삭제`}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <Input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://portfolio.example.com"
                className="flex-1 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPortfolioLink()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addPortfolioLink}
                disabled={!newLink.trim()}
                className="min-h-[44px] min-w-[80px]"
              >
                추가
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="min-h-[44px]"
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.proposal_text || formData.proposal_text.length < 50}
          className="min-h-[44px] min-w-[120px]"
          isLoading={loading}
          loadingText="제출 중..."
        >
          제안서 제출
        </Button>
      </div>
    </form>
  )
}