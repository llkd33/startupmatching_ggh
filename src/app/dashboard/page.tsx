'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Briefcase, 
  Users, 
  FileText, 
  PlusCircle,
  Activity,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  DollarSign
} from 'lucide-react'
import { EnhancedStatCard } from '@/components/dashboard/EnhancedStatCard'
import { NextStepWidget, getNextStepForUser } from '@/components/dashboard/NextStepWidget'
import { ErrorAlert } from '@/components/ui/error-alert'
import { DashboardSkeleton } from '@/components/ui/loading-states'

// 개발 모드 체크
function isDevMode() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('dev_mode') === 'true'
}

export default function FastDashboardPage() {
  const router = useRouter()
  const { user, role: authRole, loading: authLoading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    campaigns: 0,
    proposals: 0,
    messages: 0,
    connections: 0
  })
  const [proposalStats, setProposalStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    under_review: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [pageReady, setPageReady] = useState(false)
  const [profileComplete, setProfileComplete] = useState<boolean | undefined>(undefined)
  const [expertProfile, setExpertProfile] = useState<any>(null)
  const [recommendedCampaigns, setRecommendedCampaigns] = useState<any[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initializedDashboardRef = useRef<string | null>(null)

  useEffect(() => {
    if (isDevMode()) {
      if (initializedDashboardRef.current === 'dev') {
        return
      }

      initializedDashboardRef.current = 'dev'
      const mockUser = JSON.parse(localStorage.getItem('dev_user') || '{}')
      setUserRole(mockUser.role || 'expert')
      setUserName(mockUser.name || '개발자')
      setUserId('dev-user-id')
      setPageReady(true)
      
      // 가짜 데이터 지연 로드
      setTimeout(() => {
        setStats({
          campaigns: 5,
          proposals: 12,
          messages: 3,
          connections: 24
        })
        setProfileComplete(false) // 개발 모드에서는 미완성으로 표시
        setStatsLoading(false)
      }, 300)
      return
    }

    if (authLoading) {
      return
    }

    if (!user) {
      router.replace('/auth/login')
      return
    }

    const role = authRole || user.user_metadata?.role || 'expert'
    const name = user.user_metadata?.name || user.email?.split('@')[0] || '사용자'
    const dashboardKey = `${user.id}:${role}`
    const shouldLoadBackgroundData = initializedDashboardRef.current !== dashboardKey

    initializedDashboardRef.current = dashboardKey
    setUserRole(role)
    setUserName(name)
    setUserId(user.id)
    setPageReady(true)
    setError(null)

    if (!shouldLoadBackgroundData) {
      return
    }

    setStatsLoading(true)
    setCampaignsLoading(false)
    setProfileComplete(undefined)
    setExpertProfile(null)
    setRecommendedCampaigns([])

    void loadStatsInBackground(user.id, role)
    void loadProfileStatus(user.id, role)

    if (role === 'expert') {
      void loadExpertProfile(user.id)
    }
  }, [authLoading, authRole, router, user])

  const loadProfileStatus = async (userId: string, role: string) => {
    try {
      if (role === 'expert') {
        const { data: profile } = await supabase
          .from('expert_profiles')
          .select('is_profile_complete')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        setProfileComplete(profile?.is_profile_complete ?? false)
      } else if (role === 'organization') {
        const { data: profile } = await supabase
          .from('organization_profiles')
          .select('is_profile_complete')
          .eq('user_id', userId)
          .maybeSingle()
        
        setProfileComplete(profile?.is_profile_complete ?? false)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Profile status loading skipped:', error)
      }
      // 프로필 상태 로딩 실패는 치명적이지 않음
      setProfileComplete(undefined)
    }
  }

  const loadExpertProfile = async (userId: string) => {
    try {
      // 전문가 프로필 정보 가져오기
      const { data: expertProfileData } = await supabase
        .from('expert_profiles')
        .select('id, skills, service_regions, hashtags')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (expertProfileData) {
        setExpertProfile(expertProfileData)
        // 추천 캠페인 로드 (expert_id 필요)
        loadRecommendedCampaigns(expertProfileData)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Expert profile loading skipped:', error)
      }
    }
  }

  const loadRecommendedCampaigns = async (profile: { id: string, skills: string[], service_regions: string[], hashtags?: string[] }) => {
    if (!profile.skills || profile.skills.length === 0) return
    
    setCampaignsLoading(true)
    try {
      // 전문가의 스킬과 해시태그를 키워드로 사용
      const keywords = [...(profile.skills || []), ...(profile.hashtags || [])]
      const locations = profile.service_regions || []
      
      // 이미 제안서를 제출한 캠페인 ID 가져오기
      const { data: existingProposals } = await supabase
        .from('proposals')
        .select('campaign_id')
        .eq('expert_id', profile.id)
      
      const submittedCampaignIds = new Set(existingProposals?.map((p: any) => p.campaign_id) || [])
      
      // 활성 캠페인 가져오기 (더 많이 가져온 후 필터링)
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          title,
          description,
          type,
          category,
          keywords,
          budget_min,
          budget_max,
          location,
          status,
          created_at,
          organization_profiles(organization_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30) // 더 많이 가져온 후 필터링
      
      if (error) throw error
      
      if (campaigns && campaigns.length > 0) {
        // 클라이언트 측에서 매칭 점수 계산
        const scoredCampaigns = campaigns
          .filter((campaign: any) => !submittedCampaignIds.has(campaign.id)) // 이미 제출한 캠페인 제외
          .map((campaign: any) => {
            let score = 0
            const campaignKeywords = campaign.keywords || []
            
            // 키워드 매칭 점수 계산 (최대 60점)
            const matchingKeywords = keywords.filter((keyword: string) =>
              campaignKeywords.some((ck: string) =>
                ck.toLowerCase().includes(keyword.toLowerCase()) ||
                keyword.toLowerCase().includes(ck.toLowerCase())
              )
            )
            if (campaignKeywords.length > 0) {
              score += Math.min((matchingKeywords.length / campaignKeywords.length) * 60, 60)
            }
            
            // 지역 매칭 (최대 20점)
            if (locations.length > 0 && campaign.location) {
              const hasLocationMatch = locations.some((loc: string) => {
                if (loc === '전국' || loc === '원격') return true
                return campaign.location?.includes(loc) || loc.includes(campaign.location)
              })
              if (hasLocationMatch) {
                score += 20
              }
            }
            
            // 최신성 보너스 (최대 20점)
            const daysSinceCreated = Math.floor(
              (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSinceCreated < 7) {
              score += 20
            } else if (daysSinceCreated < 30) {
              score += 10
            }
            
            return { ...campaign, matchScore: Math.round(score) }
          })
          .filter((c: any) => c.matchScore > 0) // 매칭 점수가 있는 것만
          .sort((a: any, b: any) => {
            // 점수 순, 같으면 최신순
            if (b.matchScore !== a.matchScore) {
              return b.matchScore - a.matchScore
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          .slice(0, 3) // 상위 3개만
        
        setRecommendedCampaigns(scoredCampaigns)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Recommended campaigns loading skipped:', error)
      }
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadStatsInBackground = async (userId: string, role: string) => {
    try {
      if (role === 'expert') {
        // 전문가: 제안서 상태별 통계, 메시지 카운트
        // 먼저 expert_profiles의 id 가져오기
        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        if (expertProfile) {
          // 한 번의 쿼리로 제안서 데이터와 통계를 모두 가져오기 (성능 최적화)
          const [proposalsResult, messagesResult] = await Promise.all([
            supabase
              .from('proposals')
              .select('status')
              .eq('expert_id', expertProfile.id),
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          ])
          
          // 상태별 통계 계산 (클라이언트 측에서)
          const statusCounts = {
            pending: 0,
            accepted: 0,
            rejected: 0,
            withdrawn: 0,
            under_review: 0
          }
          
          if (proposalsResult.data) {
            proposalsResult.data.forEach((p: any) => {
              const status = p.status || 'pending'
              if (status in statusCounts) {
                statusCounts[status as keyof typeof statusCounts]++
              }
            })
          }
          
          setProposalStats(statusCounts)
          
          setStats(prev => ({
            ...prev,
            proposals: proposalsResult.data?.length || 0,
            messages: messagesResult.count || 0
          }))
        }
      } else {
        // 기관: organization_profiles에서 organization_id 가져오기
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (orgProfile) {
          // 병렬로 통계 조회 (성능 최적화)
          const [campaignsResult, messagesResult] = await Promise.all([
            supabase
              .from('campaigns')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', orgProfile.id),
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          ])
          
          // 캠페인 ID로 제안서 통계 조회
          const campaignIds = campaignsResult.data?.map((c: any) => c.id) || []
          const proposalsResult = campaignIds.length > 0
            ? await supabase
                .from('proposals')
                .select('*', { count: 'exact', head: true })
                .in('campaign_id', campaignIds)
            : { count: 0, error: null }
          
          setStats(prev => ({
            ...prev,
            campaigns: campaignsResult.count || 0,
            proposals: proposalsResult.count || 0,
            messages: messagesResult.count || 0
          }))
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Stats loading skipped:', error)
      }
      setError('통계를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setStatsLoading(false)
    }
  }

  // 페이지 준비 전에는 스켈레톤 로더 표시
  if (!pageReady) {
    return <DashboardSkeleton />
  }

  const nextStep = getNextStepForUser(userRole, stats, profileComplete)

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* 에러 표시 */}
      {error && (
        <ErrorAlert
          title="오류가 발생했습니다"
          description={error}
          type="generic"
          action={{
            label: "다시 시도",
            onClick: () => {
              setError(null)
              if (userId && userRole) {
                loadStatsInBackground(userId, userRole)
                loadProfileStatus(userId, userRole)
              }
            }
          }}
        />
      )}

      {/* 헤더 - 즉시 표시 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">안녕하세요, {userName}님!</h1>
          <p className="text-muted-foreground">
            {userRole === 'expert' ? '전문가' : '기관'} 대시보드
          </p>
        </div>
        <Button asChild>
          <Link href={userRole === 'expert' ? '/dashboard/campaigns' : '/dashboard/campaigns/create'}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {userRole === 'expert' ? '캠페인 찾기' : '새 캠페인'}
          </Link>
        </Button>
      </div>

      {/* 프로필 완성 배너 - 전문가 전용 */}
      {userRole === 'expert' && profileComplete === false && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                  ✨ 프로필을 완성하고 더 많은 기회를 잡으세요!
                </h3>
                <p className="text-sm text-yellow-800">
                  프로필 완성도가 높을수록 더 많은 캠페인에 매칭되고, 승인 확률이 높아집니다.
                </p>
              </div>
              <Button asChild className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Link href="/profile/expert/complete">
                  프로필 완성하기 →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 다음 단계 위젯 */}
      {nextStep && (
        <NextStepWidget {...nextStep} />
      )}

      {/* 통계 카드 - 개선된 버전 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatCard
          title={userRole === 'expert' ? '진행 중 제안' : '활성 캠페인'}
          value={userRole === 'expert' ? stats.proposals : stats.campaigns}
          icon={Briefcase}
          loading={statsLoading}
          href={userRole === 'expert' ? '/dashboard/proposals' : '/dashboard/campaigns'}
          trend={userRole === 'expert' && stats.proposals > 0 ? {
            value: 12,
            period: '이번 주'
          } : undefined}
          description={userRole === 'expert' ? '제출한 제안서 수' : '진행 중인 캠페인 수'}
        />
        <EnhancedStatCard
          title="새 메시지"
          value={stats.messages}
          icon={MessageSquare}
          loading={statsLoading}
          href="/dashboard/messages"
          description="받은 메시지 수"
        />
        <EnhancedStatCard
          title="연결"
          value={stats.connections}
          icon={Users}
          loading={statsLoading}
          href="/dashboard/connection-requests"
          description="연결된 사용자 수"
        />
        <EnhancedStatCard
          title="이번 달 활동"
          value={statsLoading ? '-' : (stats.proposals + stats.campaigns + stats.messages > 0 ? '활발' : '시작하기')}
          icon={Activity}
          loading={statsLoading}
          description="전체 활동 요약"
        />
      </div>

      {/* 빠른 액션 - 즉시 표시 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>빠른 시작</CardTitle>
            <CardDescription>자주 사용하는 기능에 빠르게 접근하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userRole === 'expert' ? (
              <>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/campaigns">
                    <Briefcase className="mr-2 h-4 w-4" />
                    새로운 캠페인 찾아보기
                  </Link>
                </Button>
                {(proposalStats.pending > 0 || proposalStats.under_review > 0) && (
                  <Button variant="outline" className="w-full justify-start bg-yellow-50 hover:bg-yellow-100 border-yellow-300" asChild>
                    <Link href="/dashboard/proposals?status=pending">
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      검토중 제안서 ({proposalStats.pending + proposalStats.under_review}건)
                    </Link>
                  </Button>
                )}
                {proposalStats.accepted > 0 && (
                  <Button variant="outline" className="w-full justify-start bg-green-50 hover:bg-green-100 border-green-300" asChild>
                    <Link href="/dashboard/proposals?status=accepted">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      승인된 제안서 ({proposalStats.accepted}건)
                    </Link>
                  </Button>
                )}
                {proposalStats.rejected > 0 && (
                  <Button variant="outline" className="w-full justify-start bg-red-50 hover:bg-red-100 border-red-300" asChild>
                    <Link href="/dashboard/proposals?status=rejected">
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      거절된 제안서 ({proposalStats.rejected}건)
                      <span className="ml-auto text-xs text-red-600">피드백 확인</span>
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/proposals">
                    <FileText className="mr-2 h-4 w-4" />
                    전체 제안서 관리
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    메시지 확인
                    {stats.messages > 0 && (
                      <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.messages}
                      </span>
                    )}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/campaigns/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    새 캠페인 만들기
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/campaigns">
                    <Briefcase className="mr-2 h-4 w-4" />
                    내 캠페인 관리
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/campaigns?status=submitted">
                    <FileText className="mr-2 h-4 w-4" />
                    검토 대기 제안서 ({stats.proposals || 0})
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    메시지 ({stats.messages || 0})
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {userRole === 'organization' ? (
          <Card>
            <CardHeader>
              <CardTitle>캠페인 인사이트</CardTitle>
              <CardDescription>효과적인 캠페인 운영 팁</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium mb-1 text-blue-900">💡 더 많은 제안 받기</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>명확한 캠페인 설명 작성</li>
                  <li>적절한 예산 범위 설정</li>
                  <li>필요한 스킬을 구체적으로 기재</li>
                </ul>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium mb-1 text-green-900">⚡ 빠른 매칭 팁</h4>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>제안서에 24시간 내 응답</li>
                  <li>관심 있는 전문가에게 직접 연락</li>
                  <li>일괄 작업으로 효율성 향상</li>
                </ul>
              </div>
              {stats.campaigns === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium mb-1 text-yellow-900">🚀 시작하기</h4>
                  <p className="text-sm text-yellow-800">
                    첫 캠페인을 생성하여 전문가를 찾아보세요!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>도움말</CardTitle>
              <CardDescription>시작하는 데 도움이 필요하신가요?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">🚀 빠른 팁</h4>
                <p className="text-sm text-muted-foreground">
                  프로필을 완성하면 더 많은 캠페인에 매칭될 수 있어요!
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">📊 성과 향상</h4>
                <p className="text-sm text-muted-foreground">
                  빠른 응답이 선택 확률을 높입니다.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 추천 캠페인 섹션 - 전문가 전용 */}
      {userRole === 'expert' && recommendedCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  나에게 맞는 추천 캠페인
                </CardTitle>
                <CardDescription>
                  내 프로필과 매칭되는 캠페인을 확인해보세요
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/campaigns">
                  전체 보기 →
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {recommendedCampaigns.map((campaign: any) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {campaign.type === 'mentoring' ? '멘토링' :
                           campaign.type === 'consulting' ? '컨설팅' :
                           campaign.type === 'development' ? '개발' :
                           campaign.type === 'service' ? '서비스' : campaign.type}
                        </Badge>
                        {campaign.matchScore > 0 && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            매칭도 {campaign.matchScore}%
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base line-clamp-2 mb-1">
                        {campaign.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-1">
                        {campaign.organization_profiles?.organization_name || '기관'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {campaign.description}
                      </p>
                      {campaign.budget_min && campaign.budget_max && (
                        <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-2">
                          <DollarSign className="h-3 w-3" />
                          ₩{campaign.budget_min.toLocaleString()} ~ ₩{campaign.budget_max.toLocaleString()}
                        </div>
                      )}
                      {campaign.keywords && campaign.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {campaign.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              #{keyword}
                            </span>
                          ))}
                          {campaign.keywords.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{campaign.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <Button className="w-full" size="sm" asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}/propose`}>
                          제안서 작성하기
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 추천 캠페인이 없을 때 안내 - 전문가 전용 */}
      {userRole === 'expert' && !campaignsLoading && recommendedCampaigns.length === 0 && expertProfile && expertProfile.skills && expertProfile.skills.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                현재 매칭되는 캠페인이 없습니다
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                새로운 캠페인이 등록되면 알려드릴게요. 다른 캠페인도 둘러보세요!
              </p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/campaigns">
                  전체 캠페인 보기
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
