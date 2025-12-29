'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  MapPin,
  Users,
  Building2,
  FileText,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/toast-custom'
import { BookmarkButton } from '@/components/ui/bookmark-button'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { PageLoading } from '@/components/ui/loading-states'

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
  created_at: string
  organization_profiles: {
    organization_name: string
    representative_name: string
    industry: string
    user_id: string
  }
}

interface Proposal {
  id: string
  expert_id: string
  proposal_text: string
  estimated_budget: number | null
  estimated_start_date: string | null
  estimated_end_date: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  submitted_at: string
  expert_profiles: {
    name: string
    title: string
    hourly_rate: number | null
    users: {
      email: string
    }
  }
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [expertProfile, setExpertProfile] = useState<any>(null)
  const [existingProposal, setExistingProposal] = useState<any>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

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

    setUserId(user.id)

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load user role:', userError)
      }
      return
    }

    if (userData) {
      setUserRole(userData.role)

      if (userData.role === 'expert') {
        // Get expert profile
        const { data: expertData, error: expertError } = await supabase
          .from('expert_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (expertError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to load expert profile:', expertError)
          }
        } else {
          setExpertProfile(expertData)
        }

        // Check if already submitted proposal
        if (expertData) {
          const { data: proposalData, error: proposalError } = await supabase
            .from('proposals')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('expert_id', expertData.id)
            .maybeSingle()

          if (proposalError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to check existing proposal:', proposalError)
            }
          } else {
            setExistingProposal(proposalData)
          }
        }
      }
      
      await Promise.all([
        loadCampaign(campaignId),
        loadProposals(campaignId)
      ])
    }
  }

  const loadCampaign = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles(
            organization_name,
            representative_name,
            industry,
            user_id
          )
        `)
        .eq('id', campaignId)
        .maybeSingle()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading campaign:', error)
      }
    }
  }

  const loadProposals = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          expert_profiles(
            name,
            title,
            hourly_rate,
            users(email)
          )
        `)
        .eq('campaign_id', campaignId)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading proposals:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProposalAction = async (proposalId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', proposalId)

      if (error) throw error

      // Reload proposals
      if (campaign) {
        await loadProposals(campaign.id)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating proposal:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행중'
      case 'draft': return '임시저장'
      case 'completed': return '완료'
      case 'cancelled': return '취소됨'
      default: return status
    }
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

  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProposalStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '검토중'
      case 'accepted': return '승인됨'
      case 'rejected': return '거절됨'
      case 'withdrawn': return '철회됨'
      default: return status
    }
  }

  const getProposalStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'withdrawn': return <Clock className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const canManageCampaign = () => {
    return userRole === 'organization' && campaign?.organization_profiles.user_id === userId
  }

  const canSubmitProposal = () => {
    return userRole === 'expert' && 
           campaign?.status === 'active' && 
           expertProfile && 
           !existingProposal
  }

  const handleCloseCampaign = async () => {
    if (!campaign || !userId) return

    setIsClosing(true)
    try {
      // organization_profile의 id 조회
      const { data: orgProfile, error: orgError } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (orgError) throw orgError
      if (!orgProfile) {
        toast.error('조직 프로필을 찾을 수 없습니다.')
        setCloseDialogOpen(false)
        return
      }

      // 캠페인 종료 (상태를 completed로 변경)
      // 제안서가 있어도 종료 가능
      const { error } = await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
        .eq('organization_id', orgProfile.id)

      if (error) throw error

      toast.success('캠페인이 종료되었습니다.')
      setCloseDialogOpen(false)

      // 캠페인 정보 새로고침
      await checkAuthAndLoadData(campaign.id)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Close campaign error:', error)
      }
      toast.error('캠페인 종료에 실패했습니다.')
    } finally {
      setIsClosing(false)
    }
  }

  if (loading) {
    return <PageLoading title="캠페인을 불러오는 중..." />
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">캠페인을 찾을 수 없습니다</h3>
            <p className="text-sm text-gray-500 mb-4">
              요청하신 캠페인이 존재하지 않거나 접근 권한이 없습니다.
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
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
          <h1 className="text-2xl font-bold">캠페인 상세</h1>
          <p className="text-gray-600">캠페인 정보와 제안서를 확인하세요</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Campaign Info */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{getTypeText(campaign.type)}</Badge>
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusText(campaign.status)}
                  </Badge>
                  {campaign.category && (
                    <Badge variant="secondary">{campaign.category}</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl mb-2">{campaign.title}</CardTitle>
                <CardDescription className="text-base">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {campaign.organization_profiles.organization_name}
                  </div>
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                {/* Bookmark button for experts */}
                {userId && userRole === 'expert' && (
                  <BookmarkButton
                    userId={userId}
                    targetId={campaign.id}
                    targetType="campaign"
                    variant="outline"
                    showLabel
                  />
                )}

                {canSubmitProposal() && (
                  <Button asChild>
                    <Link href={`/dashboard/campaigns/${campaign.id}/propose`}>
                      <FileText className="h-4 w-4 mr-2" />
                      제안서 작성
                    </Link>
                  </Button>
                )}

                {existingProposal && (
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/proposals/${existingProposal.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      내 제안서 보기
                    </Link>
                  </Button>
                )}

                {canManageCampaign() && (
                  <>
                    {campaign.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCloseDialogOpen(true)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        종료
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        수정
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">{campaign.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {campaign.budget_min && campaign.budget_max && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">예산</p>
                    <p className="text-gray-600">
                      ₩{campaign.budget_min.toLocaleString()} - ₩{campaign.budget_max.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium">필요 전문가</p>
                  <p className="text-gray-600">{campaign.required_experts}명</p>
                </div>
              </div>
              
              {campaign.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">위치</p>
                    <p className="text-gray-600">{campaign.location}</p>
                  </div>
                </div>
              )}
              
              {campaign.start_date && campaign.end_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">기간</p>
                    <p className="text-gray-600">
                      {new Date(campaign.start_date).toLocaleDateString()} ~ {new Date(campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {campaign.keywords.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-2">키워드</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              기관 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">기관명</p>
                <p className="text-sm">{campaign.organization_profiles.organization_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">대표자</p>
                <p className="text-sm">{campaign.organization_profiles.representative_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">업종</p>
                <p className="text-sm">{campaign.organization_profiles.industry || '미지정'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposals */}
        <Tabs defaultValue="proposals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="proposals">
              제안서 ({proposals.length})
            </TabsTrigger>
            <TabsTrigger value="stats">통계</TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="space-y-4">
            {proposals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">아직 제안서가 없습니다</h3>
                  <p className="text-sm text-gray-500">
                    전문가들의 제안서를 기다리고 있습니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getProposalStatusColor(proposal.status)}>
                              <div className="flex items-center gap-1">
                                {getProposalStatusIcon(proposal.status)}
                                {getProposalStatusText(proposal.status)}
                              </div>
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(proposal.submitted_at), {
                                addSuffix: true,
                                locale: ko
                              })}
                            </span>
                          </div>
                          <CardTitle className="text-lg">
                            {proposal.expert_profiles.name}
                          </CardTitle>
                          <CardDescription>
                            {proposal.expert_profiles.title}
                          </CardDescription>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/proposals/${proposal.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/messages/${campaign.id}`}>
                              <MessageCircle className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          {canManageCampaign() && proposal.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleProposalAction(proposal.id, 'accept')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                승인
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProposalAction(proposal.id, 'reject')}
                              >
                                거절
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                        {proposal.proposal_text}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {proposal.estimated_budget && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            ₩{proposal.estimated_budget.toLocaleString()}
                          </div>
                        )}
                        {proposal.expert_profiles.hourly_rate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            ₩{proposal.expert_profiles.hourly_rate.toLocaleString()}/시간
                          </div>
                        )}
                        {proposal.estimated_start_date && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {new Date(proposal.estimated_start_date).toLocaleDateString()} 시작
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">전체 제안서</p>
                      <p className="text-2xl font-bold">{proposals.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">검토중</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {proposals.filter(p => p.status === 'pending').length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">승인됨</p>
                      <p className="text-2xl font-bold text-green-600">
                        {proposals.filter(p => p.status === 'accepted').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">평균 제안 금액</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {proposals.filter(p => p.estimated_budget).length > 0
                          ? `₩${Math.round(
                              proposals
                                .filter(p => p.estimated_budget)
                                .reduce((sum, p) => sum + (p.estimated_budget || 0), 0) /
                              proposals.filter(p => p.estimated_budget).length
                            ).toLocaleString()}`
                          : '₩0'
                        }
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 종료 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleCloseCampaign}
        title="캠페인 종료"
        message="이 캠페인을 종료하시겠습니까? 종료된 캠페인은 더 이상 제안서를 받지 않습니다. 인원이 다 차지 않아도 종료할 수 있습니다."
        type="warning"
        confirmText="종료"
        cancelText="취소"
        loading={isClosing}
      />
    </div>
  )
}
