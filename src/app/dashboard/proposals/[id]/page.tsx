'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  ExternalLink,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Building2,
  FileText,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ProposalDetail {
  id: string
  campaign_id: string
  expert_id: string
  proposal_text: string
  estimated_budget: number | null
  estimated_start_date: string | null
  estimated_end_date: string | null
  portfolio_links: string[]
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  response_message: string | null
  submitted_at: string
  reviewed_at: string | null
  campaigns: {
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
      user_id: string
    }
  }
  expert_profiles: {
    name: string
    title: string
    bio: string
    hourly_rate: number | null
    experience_years: number
    skills: string[]
    users: {
      email: string
    }
  }
}

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [proposal, setProposal] = useState<ProposalDetail | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null)

  useEffect(() => {
    if (id) {
      checkAuthAndLoadProposal(id)
    }
  }, [id])

  const checkAuthAndLoadProposal = async (proposalId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUserId(user.id)

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      console.error('Failed to load user role:', userError)
      return
    }

    if (userData) {
      setUserRole(userData.role)
      await loadProposal(proposalId)
    }
  }

  const loadProposal = async (proposalId: string) => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          campaigns(
            *,
            organization_profiles(
              organization_name,
              representative_name,
              industry,
              user_id
            )
          ),
          expert_profiles(
            name,
            title,
            bio,
            hourly_rate,
            experience_years,
            skills,
            users(email)
          )
        `)
        .eq('id', proposalId)
        .maybeSingle()

      if (error) throw error

      setProposal(data)
    } catch (error) {
      console.error('Error loading proposal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProposalAction = async (action: 'accept' | 'reject') => {
    if (!proposal || updating) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          response_message: responseMessage.trim() || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', proposal.id)

      if (error) throw error

      // Reload proposal
      if (id) {
        await loadProposal(id)
      }
      setShowResponseForm(false)
      setResponseMessage('')
      setActionType(null)
    } catch (error) {
      console.error('Error updating proposal:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleWithdrawProposal = async () => {
    if (!proposal || updating) return

    const confirmed = confirm('정말로 제안서를 철회하시겠습니까?')
    if (!confirmed) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'withdrawn',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', proposal.id)

      if (error) throw error

      if (id) {
        await loadProposal(id)
      }
    } catch (error) {
      console.error('Error withdrawing proposal:', error)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '검토중'
      case 'accepted': return '승인됨'
      case 'rejected': return '거절됨'
      case 'withdrawn': return '철회됨'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-5 w-5" />
      case 'accepted': return <CheckCircle className="h-5 w-5" />
      case 'rejected': return <XCircle className="h-5 w-5" />
      case 'withdrawn': return <Clock className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const canManageProposal = () => {
    if (!proposal || !userId) return false
    
    if (userRole === 'organization') {
      return proposal.campaigns.organization_profiles.user_id === userId
    }
    
    return false
  }

  const canWithdrawProposal = () => {
    if (!proposal || !userId) return false
    
    if (userRole === 'expert') {
      // Expert can withdraw their own pending proposals
      return proposal.status === 'pending'
    }
    
    return false
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">제안서를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">제안서를 찾을 수 없습니다</h3>
            <p className="text-sm text-gray-500 mb-4">
              요청하신 제안서가 존재하지 않거나 접근 권한이 없습니다.
            </p>
            <Button asChild>
              <Link href="/dashboard/proposals">제안서 목록으로 돌아가기</Link>
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
          <h1 className="text-2xl font-bold">제안서 상세</h1>
          <p className="text-gray-600">제안서 내용을 확인하고 관리하세요</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={getStatusColor(proposal.status)}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(proposal.status)}
                      {getStatusText(proposal.status)}
                    </div>
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(proposal.submitted_at), {
                      addSuffix: true,
                      locale: ko
                    })} 제출
                  </span>
                </div>
                <CardTitle className="text-xl">{proposal.campaigns.title}</CardTitle>
                <CardDescription>
                  {proposal.campaigns.organization_profiles.organization_name}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/messages/${proposal.campaign_id}`}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    메시지
                  </Link>
                </Button>
                
                {canManageProposal() && proposal.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionType('accept')
                        setShowResponseForm(true)
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionType('reject')
                        setShowResponseForm(true)
                      }}
                    >
                      거절
                    </Button>
                  </>
                )}
                
                {canWithdrawProposal() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWithdrawProposal}
                    disabled={updating}
                  >
                    철회
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Response Form */}
        {showResponseForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {actionType === 'accept' ? '제안서 승인' : '제안서 거절'}
              </CardTitle>
              <CardDescription>
                {actionType === 'accept' 
                  ? '제안서를 승인하고 전문가에게 메시지를 보내세요'
                  : '거절 사유를 전문가에게 전달해주세요'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder={actionType === 'accept' 
                    ? '승인 메시지를 입력하세요 (선택사항)'
                    : '거절 사유를 입력하세요'}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleProposalAction(actionType!)}
                    disabled={updating}
                    className={actionType === 'accept' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {updating ? '처리중...' : (actionType === 'accept' ? '승인하기' : '거절하기')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResponseForm(false)
                      setResponseMessage('')
                      setActionType(null)
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              캠페인 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{proposal.campaigns.title}</h4>
              <p className="text-sm text-gray-600 mb-4">{proposal.campaigns.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">기관</p>
                <p className="text-sm">{proposal.campaigns.organization_profiles.organization_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">업종</p>
                <p className="text-sm">{proposal.campaigns.organization_profiles.industry || '미지정'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">프로젝트 유형</p>
                <p className="text-sm">{proposal.campaigns.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">필요 전문가 수</p>
                <p className="text-sm">{proposal.campaigns.required_experts}명</p>
              </div>
            </div>

            {proposal.campaigns.budget_min && proposal.campaigns.budget_max && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">예산 범위</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    ₩{proposal.campaigns.budget_min.toLocaleString()} - ₩{proposal.campaigns.budget_max.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {proposal.campaigns.keywords.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">키워드</p>
                <div className="flex flex-wrap gap-2">
                  {proposal.campaigns.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      #{keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expert Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              전문가 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">이름</p>
                <p className="text-sm">{proposal.expert_profiles.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">직책</p>
                <p className="text-sm">{proposal.expert_profiles.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">경력</p>
                <p className="text-sm">{proposal.expert_profiles.experience_years}년</p>
              </div>
              {proposal.expert_profiles.hourly_rate && (
                <div>
                  <p className="text-sm font-medium text-gray-700">시급</p>
                  <p className="text-sm">₩{proposal.expert_profiles.hourly_rate.toLocaleString()}/시간</p>
                </div>
              )}
            </div>

            {proposal.expert_profiles.bio && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">소개</p>
                <p className="text-sm text-gray-600">{proposal.expert_profiles.bio}</p>
              </div>
            )}

            {proposal.expert_profiles.skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">기술 스택</p>
                <div className="flex flex-wrap gap-2">
                  {proposal.expert_profiles.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposal Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              제안 내용
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{proposal.proposal_text}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {proposal.estimated_budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">제안 금액</p>
                    <p className="text-sm">₩{proposal.estimated_budget.toLocaleString()}</p>
                  </div>
                </div>
              )}
              
              {proposal.estimated_start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">시작 예정일</p>
                    <p className="text-sm">
                      {new Date(proposal.estimated_start_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              )}
              
              {proposal.estimated_end_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">완료 예정일</p>
                    <p className="text-sm">
                      {new Date(proposal.estimated_end_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {proposal.portfolio_links.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3">포트폴리오 링크</p>
                <div className="space-y-2">
                  {proposal.portfolio_links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {link}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Message */}
        {proposal.response_message && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">응답 메시지</CardTitle>
              <CardDescription>
                {proposal.reviewed_at && (
                  <>
                    {formatDistanceToNow(new Date(proposal.reviewed_at), {
                      addSuffix: true,
                      locale: ko
                    })} 응답
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{proposal.response_message}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
