'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAutoSave, getDraftMetadata } from '@/hooks/useAutoSave'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  LinkIcon,
  Building2,
  MapPin,
  Users,
  Clock,
  Plus,
  X
} from 'lucide-react'
import Link from 'next/link'
import { AutoSaveIndicator, DraftRestorePrompt } from '@/components/ui/auto-save-indicator'
import { toast } from '@/components/ui/toast-custom'

interface Campaign {
  id: string
  title: string
  description: string
  type: string
  category: string
  keywords: string[]
  budget_min: number | null
  budget_max: number | null
  start_date: string | null
  end_date: string | null
  location: string | null
  required_experts: number
  status: string
  organization_profiles: {
    organization_name: string
    representative_name: string
    industry: string
  }
}

export default function ProposePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [expertProfile, setExpertProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [draftMetadata, setDraftMetadata] = useState<{ timestamp: string } | null>(null)

  const [formData, setFormData] = useState({
    proposal_text: '',
    estimated_budget: '',
    estimated_start_date: '',
    estimated_end_date: '',
    portfolio_links: [] as string[],
  })

  const [newLink, setNewLink] = useState('')

  // 자동 저장 설정
  const autoSaveKey = `proposal-draft-${id}`

  const { save, restore, clear, state: autoSaveState } = useAutoSave({
    key: autoSaveKey,
    delay: 3000, // 3초 후 자동 저장
    enabled: !!expertProfile, // 전문가 프로필 로드 후 활성화
    onSave: () => {
      // 개발 모드에서만 로그 출력
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

  // 폼 데이터 변경 시 자동 저장
  useEffect(() => {
    if (!expertProfile) return // 프로필 로드 전에는 저장 안 함
    if (!formData.proposal_text) return // 빈 폼은 저장 안 함

    save(formData)
  }, [formData, save, expertProfile])

  useEffect(() => {
    if (id) {
      checkAuthAndLoadData(id)
    }
  }, [id])

  const checkAuthAndLoadData = async (campaignId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Check if user is an expert
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'expert') {
      router.push('/dashboard')
      return
    }

    // Get expert profile
    const { data: expertData } = await supabase
      .from('expert_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!expertData) {
      router.push('/profile/expert/complete')
      return
    }

    setExpertProfile(expertData)

    // Check if already submitted proposal
    const { data: existingProposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('expert_id', expertData.id)
      .single()

    if (existingProposal) {
      router.push(`/dashboard/proposals/${existingProposal.id}`)
      return
    }

    await loadCampaign(campaignId)
  }

  const loadCampaign = async (campaignId: string) => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles(
            organization_name,
            representative_name,
            industry
          )
        `)
        .eq('id', campaignId)
        .eq('status', 'active')
        .single()

      if (error) throw error

      setCampaign(data)
    } catch (error) {
      // 개발 모드에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading campaign:', error)
      }
      setError('캠페인을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaign || !expertProfile || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const proposalData = {
        campaign_id: campaign.id,
        expert_id: expertProfile.id,
        proposal_text: formData.proposal_text,
        estimated_budget: formData.estimated_budget ? parseInt(formData.estimated_budget) : null,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_end_date: formData.estimated_end_date || null,
        portfolio_links: formData.portfolio_links,
      }

      const { error } = await supabase
        .from('proposals')
        .insert(proposalData)

      if (error) throw error

      // 성공 시 임시 저장 데이터 삭제
      clear()
      toast.success('제안서가 제출되었습니다')

      router.push('/dashboard/proposals')
    } catch (err: any) {
      setError(err.message || '제안서 제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 임시 저장 데이터 복구
  const handleRestoreDraft = () => {
    const restoredData = restore()
    if (restoredData) {
      setFormData(restoredData)
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

  const addPortfolioLink = () => {
    if (!newLink.trim()) return

    try {
      new URL(newLink)
      setFormData(prev => ({
        ...prev,
        portfolio_links: [...prev.portfolio_links, newLink.trim()],
      }))
      setNewLink('')
    } catch {
      setError('올바른 URL을 입력해주세요.')
    }
  }

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      portfolio_links: prev.portfolio_links.filter((_, i) => i !== index),
    }))
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'mentoring': return '멘토링/강의'
      case 'investment': return '투자 매칭'
      case 'service': return '서비스 아웃소싱'
      case 'consulting': return '컨설팅'
      case 'development': return '개발'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">캠페인을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">캠페인을 찾을 수 없습니다</h3>
            <p className="text-sm text-gray-500 mb-4">
              요청하신 캠페인이 존재하지 않거나 더 이상 활성화되지 않습니다.
            </p>
            <Button asChild>
              <Link href="/dashboard/campaigns">캠페인 목록으로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">제안서 작성</h1>
          <p className="text-gray-600">캠페인에 대한 제안서를 작성해주세요</p>
        </div>

        {/* 자동 저장 상태 표시 */}
        {expertProfile && (
          <AutoSaveIndicator
            isSaving={autoSaveState.isSaving}
            lastSaved={autoSaveState.lastSaved}
          />
        )}
      </div>

      {/* 임시 저장 데이터 복구 프롬프트 */}
      {showDraftPrompt && draftMetadata && (
        <DraftRestorePrompt
          draftTimestamp={draftMetadata.timestamp}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      <div className="grid gap-6">
        {/* Campaign Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{getTypeText(campaign.type)}</Badge>
                  {campaign.category && (
                    <Badge variant="secondary">{campaign.category}</Badge>
                  )}
                </div>
                <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
                <CardDescription>
                  {campaign.organization_profiles.organization_name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">{campaign.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {campaign.budget_min && campaign.budget_max && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  ₩{campaign.budget_min.toLocaleString()} - ₩{campaign.budget_max.toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                {campaign.required_experts}명 필요
              </div>
              {campaign.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {campaign.location}
                </div>
              )}
              {campaign.start_date && campaign.end_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {new Date(campaign.start_date).toLocaleDateString()} ~ {new Date(campaign.end_date).toLocaleDateString()}
                </div>
              )}
            </div>

            {campaign.keywords.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">키워드</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposal Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>제안 내용</CardTitle>
              <CardDescription>
                프로젝트에 대한 이해도, 수행 방안, 차별화 포인트 등을 자세히 작성해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="안녕하세요. 저는 10년차 React 전문가로서...

이 프로젝트에 대한 제 이해는 다음과 같습니다:
- 

제가 제공할 수 있는 가치:
- 

수행 계획:
1. 
2. 
3. 

기대 결과물:
- "
                value={formData.proposal_text}
                onChange={(e) => handleChange('proposal_text', e.target.value)}
                required
                rows={12}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>프로젝트 세부사항</CardTitle>
              <CardDescription>
                예상 금액, 일정 등을 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="estimated_budget" className="block text-sm font-medium text-gray-700 mb-1">
                    제안 금액 (원)
                  </label>
                  <Input
                    id="estimated_budget"
                    type="number"
                    value={formData.estimated_budget}
                    onChange={(e) => handleChange('estimated_budget', e.target.value)}
                    placeholder="3000000"
                  />
                </div>

                <div>
                  <label htmlFor="estimated_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    시작 가능일
                  </label>
                  <Input
                    id="estimated_start_date"
                    type="date"
                    value={formData.estimated_start_date}
                    onChange={(e) => handleChange('estimated_start_date', e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="estimated_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    완료 예정일
                  </label>
                  <Input
                    id="estimated_end_date"
                    type="date"
                    value={formData.estimated_end_date}
                    onChange={(e) => handleChange('estimated_end_date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>포트폴리오 링크</CardTitle>
              <CardDescription>
                관련 프로젝트나 포트폴리오 링크를 추가해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.portfolio_links.length > 0 && (
                <div className="space-y-2">
                  {formData.portfolio_links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm text-blue-600 hover:text-blue-500 truncate"
                      >
                        {link}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(index)}
                        className="p-1 h-auto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://portfolio.example.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPortfolioLink}
                  disabled={!newLink.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.proposal_text.trim()}
            >
              {submitting ? '제출 중...' : '제안서 제출'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
