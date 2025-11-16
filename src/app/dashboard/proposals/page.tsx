'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  FileText, 
  Calendar, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageCircle,
  Filter,
  TrendingUp,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FormSkeleton } from '@/components/ui/loading-states'
import { NoProposals, NoSearchResults } from '@/components/ui/empty-state'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { handleSupabaseError } from '@/lib/error-handler'
import { ProposalActions } from '@/components/proposal/ProposalActions'

interface Proposal {
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
    title: string
    description: string
    status: string
    organization_profiles: {
      organization_name: string
      user_id: string
    }
  }
  expert_profiles?: {
    name: string
    title: string
    hourly_rate: number | null
    users: {
      email: string
    }
  }
}

interface ProposalStats {
  total: number
  pending: number
  accepted: number
  rejected: number
  withdrawn: number
  responseRate: number
  avgResponseTime: number
}

function ProposalsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  // URL 쿼리 파라미터에서 status 읽기
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [stats, setStats] = useState<ProposalStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    responseRate: 0,
    avgResponseTime: 0
  })

  useEffect(() => {
    checkAuthAndLoadProposals()
  }, [])

  // URL 쿼리 파라미터 변경 감지
  useEffect(() => {
    const statusFromUrl = searchParams.get('status')
    if (statusFromUrl && statusFromUrl !== statusFilter) {
      setStatusFilter(statusFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    filterProposals()
  }, [proposals, searchTerm, statusFilter])

  const checkAuthAndLoadProposals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUserId(user.id)

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      await loadProposals(user.id, userData.role)
    }
  }

  const loadProposals = async (userId: string, role: string) => {
    setLoading(true)
    
    try {
      // 먼저 proposals만 조회 (RLS 정책 문제 방지)
      let query = supabase
        .from('proposals')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (role === 'expert') {
        // For experts, show their own proposals
        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (expertProfile) {
          query = query.eq('expert_id', expertProfile.id)
        }
      } else if (role === 'organization') {
        // For organizations, show proposals for their campaigns
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (orgProfile) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('organization_id', orgProfile.id)

          if (campaigns && campaigns.length > 0) {
            const campaignIds = campaigns.map(c => c.id)
            query = query.in('campaign_id', campaignIds)
          }
        }
      }

      const { data: proposalsData, error } = await query

      if (error) {
        console.error('Error loading proposals:', error)
        // 403 에러인 경우 빈 배열로 처리하고 계속 진행
        if (error.code === 'PGRST301' || error.message?.includes('403') || error.message?.includes('permission')) {
          console.warn('Permission denied for proposals query, showing empty list')
          setProposals([])
          calculateStats([])
          return
        }
        throw error
      }

      // 관련 데이터를 별도로 조회하여 병합
      const enrichedProposals = await Promise.all(
        (proposalsData || []).map(async (proposal) => {
          try {
            // Campaign 정보 조회
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('title, description, status, organization_id')
              .eq('id', proposal.campaign_id)
              .single()

            // Organization 정보 조회
            let organizationProfile = null
            if (campaign?.organization_id) {
              const { data: org } = await supabase
                .from('organization_profiles')
                .select('organization_name, user_id')
                .eq('id', campaign.organization_id)
                .single()
              organizationProfile = org
            }

            // Expert 정보 조회
            const { data: expert } = await supabase
              .from('expert_profiles')
              .select('name, title, hourly_rate, user_id')
              .eq('id', proposal.expert_id)
              .single()

            // User 이메일 조회
            let userEmail = null
            if (expert?.user_id) {
              const { data: user } = await supabase
                .from('users')
                .select('email')
                .eq('id', expert.user_id)
                .single()
              userEmail = user?.email
            }

            return {
              ...proposal,
              campaigns: campaign ? {
                ...campaign,
                organization_profiles: organizationProfile
              } : null,
              expert_profiles: expert ? {
                ...expert,
                users: userEmail ? { email: userEmail } : null
              } : null
            }
          } catch (err) {
            // 개별 조회 실패 시 기본 데이터만 반환
            console.warn('Error enriching proposal:', err)
            return proposal
          }
        })
      )

      setProposals(enrichedProposals)
      calculateStats(enrichedProposals)
    } catch (error) {
      handleSupabaseError(error as Error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (proposalData: Proposal[]) => {
    const total = proposalData.length
    const pending = proposalData.filter(p => p.status === 'pending').length
    const accepted = proposalData.filter(p => p.status === 'accepted').length
    const rejected = proposalData.filter(p => p.status === 'rejected').length
    const withdrawn = proposalData.filter(p => p.status === 'withdrawn').length
    
    const responseRate = total > 0 ? ((accepted + rejected) / total) * 100 : 0
    
    // Calculate average response time for reviewed proposals
    const reviewedProposals = proposalData.filter(p => p.reviewed_at)
    let avgResponseTime = 0
    
    if (reviewedProposals.length > 0) {
      const totalResponseTime = reviewedProposals.reduce((sum, proposal) => {
        const submitted = new Date(proposal.submitted_at)
        const reviewed = new Date(proposal.reviewed_at!)
        const diffHours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60)
        return sum + diffHours
      }, 0)
      avgResponseTime = Math.round(totalResponseTime / reviewedProposals.length)
    }

    setStats({
      total,
      pending,
      accepted,
      rejected,
      withdrawn,
      responseRate,
      avgResponseTime
    })
  }

  const filterProposals = () => {
    let filtered = proposals

    if (searchTerm) {
      filtered = filtered.filter(proposal =>
        proposal.campaigns.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.campaigns.organization_profiles.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.proposal_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposal.expert_profiles?.name && proposal.expert_profiles.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter)
    }

    setFilteredProposals(filtered)
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
      case 'pending': return <AlertCircle className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'withdrawn': return <Clock className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const handleActionComplete = async () => {
    // Reload proposals after accept/reject action
    if (userId && userRole) {
      await loadProposals(userId, userRole)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {userRole === 'expert' ? '내 제안서' : '받은 제안서'}
              </h1>
              <p className="text-gray-600 mt-2">
                {userRole === 'expert' 
                  ? '제출한 제안서의 현황을 확인하세요'
                  : '캠페인에 대한 제안서를 검토하고 관리하세요'}
              </p>
            </div>
          </div>
        </div>
        <FormSkeleton />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {userRole === 'expert' ? '내 제안서' : '받은 제안서'}
            </h1>
            <p className="text-gray-600 mt-2">
              {userRole === 'expert' 
                ? '제출한 제안서의 현황을 확인하세요'
                : '캠페인에 대한 제안서를 검토하고 관리하세요'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">전체</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">응답률</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.responseRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">평균 응답시간</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}h</p>
                </div>
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="캠페인 제목, 기관명, 제안 내용으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input text-sm"
            >
              <option value="all">모든 상태</option>
              <option value="pending">검토중</option>
              <option value="accepted">승인됨</option>
              <option value="rejected">거절됨</option>
              <option value="withdrawn">철회됨</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Proposals List */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">목록 보기</TabsTrigger>
          <TabsTrigger value="grid">카드 보기</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                {proposals.length === 0 ? (
                  <NoProposals onBrowse={() => {
                    router.push(userRole === 'expert' ? '/dashboard/campaigns' : '/dashboard/campaigns/create')
                  }} />
                ) : (
                  <NoSearchResults onClear={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }} />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProposals.map((proposal) => (
                <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(proposal.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(proposal.status)}
                              {getStatusText(proposal.status)}
                            </div>
                          </Badge>
                          <Badge variant="outline">
                            {proposal.campaigns.status === 'active' ? '진행중' : proposal.campaigns.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-2">
                          {proposal.campaigns.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {userRole === 'organization' && proposal.expert_profiles && (
                            <span className="font-medium">
                              {proposal.expert_profiles.name} • 
                            </span>
                          )}
                          {proposal.campaigns.organization_profiles.organization_name}
                        </CardDescription>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/proposals/${proposal.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/messages/${proposal.campaign_id}`}>
                            <MessageCircle className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {proposal.estimated_budget && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          ₩{proposal.estimated_budget.toLocaleString()}
                        </div>
                      )}
                      {proposal.estimated_start_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {new Date(proposal.estimated_start_date).toLocaleDateString('ko-KR')} 시작
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(proposal.submitted_at), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-2 mb-4">
                      {proposal.proposal_text}
                    </p>

                    {proposal.portfolio_links.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-600 mb-2">포트폴리오 링크</p>
                        <div className="flex flex-wrap gap-2">
                          {proposal.portfolio_links.slice(0, 2).map((link, index) => (
                            <a
                              key={index}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-48"
                            >
                              {link}
                            </a>
                          ))}
                          {proposal.portfolio_links.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{proposal.portfolio_links.length - 2}개 더
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {userRole === 'organization' && proposal.status === 'pending' && (
                      <div className="pt-4 border-t">
                        <ProposalActions
                          proposalId={proposal.id}
                          campaignId={proposal.campaign_id}
                          expertName={proposal.expert_profiles?.name || '전문가'}
                          onActionComplete={handleActionComplete}
                        />
                      </div>
                    )}

                    {proposal.response_message && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-1">응답 메시지</p>
                        <p className="text-sm text-gray-700">{proposal.response_message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProposals.map((proposal) => (
              <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStatusColor(proposal.status)}>
                      {getStatusText(proposal.status)}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/proposals/${proposal.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <CardTitle className="text-base line-clamp-2">
                    {proposal.campaigns.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {proposal.campaigns.organization_profiles.organization_name}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                    {proposal.proposal_text}
                  </p>
                  
                  {proposal.estimated_budget && (
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-2">
                      <DollarSign className="h-3 w-3" />
                      ₩{proposal.estimated_budget.toLocaleString()}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(proposal.submitted_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <FormSkeleton />
      </div>
    }>
      <ProposalsPageContent />
    </Suspense>
  )
}