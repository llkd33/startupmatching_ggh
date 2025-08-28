'use client'

import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/error-handler'
import { toast, SUCCESS_MESSAGES } from '@/components/ui/toast-custom'
import { PageErrorBoundary, WidgetErrorBoundary } from '@/components/errors/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/loading-states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  Briefcase, 
  Users, 
  FileText, 
  TrendingUp, 
  Bell, 
  UserCheck,
  Calendar,
  Clock,
  Target,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import NotificationBadge from '@/components/notifications/NotificationBadge'
import dynamic from 'next/dynamic'

// Lazy load heavy components
const StatsChart = dynamic(() => import('@/components/dashboard/StatsChart'), {
  loading: () => <div className="h-[300px] animate-pulse bg-gray-100 rounded-lg" />,
  ssr: false
})

interface DashboardStats {
  totalConnections: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  responseRate: number
  avgResponseTime: number
  profileViews?: number
  searchAppearances?: number
  activeCampaigns?: number
  totalExperts?: number
}

interface Activity {
  id: string
  type: 'proposal' | 'message' | 'campaign' | 'notification'
  title: string
  description: string
  timestamp: string
  isNew: boolean
}

// Memoized stat card component
const StatCard = memo(({ 
  title, 
  value, 
  icon: Icon, 
  growth, 
  growthLabel 
}: {
  title: string
  value: string | number
  icon: any
  growth?: number
  growthLabel?: string
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {growth !== undefined && (
        <div className="flex items-center text-xs">
          {growth > 0 ? (
            <>
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500">{Math.abs(growth)}%</span>
            </>
          ) : (
            <>
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500">{Math.abs(growth)}%</span>
            </>
          )}
          <span className="text-muted-foreground ml-1">{growthLabel}</span>
        </div>
      )}
    </CardContent>
  </Card>
))

StatCard.displayName = 'StatCard'

// Memoized activity item component
const ActivityItem = memo(({ 
  activity, 
  formatTimestamp 
}: {
  activity: Activity
  formatTimestamp: (timestamp: string) => string
}) => (
  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${activity.isNew ? 'bg-green-500' : 'bg-gray-300'}`} />
      <div>
        <p className="font-medium">{activity.title}</p>
        <p className="text-sm text-gray-600">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
      </div>
    </div>
    <Button variant="ghost" size="sm">보기</Button>
  </div>
))

ActivityItem.displayName = 'ActivityItem'

export default function OptimizedDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalConnections: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    responseRate: 0,
    avgResponseTime: 0
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [chartData, setChartData] = useState<any>({
    connectionTrend: [],
    statusDistribution: [],
    monthlyActivity: [],
    responseTimeData: []
  })

  // Memoized functions
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}분 전`
    } else if (hours < 24) {
      return `${hours}시간 전`
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }, [])

  const loadRecentActivities = useCallback(async (userId: string, role: string) => {
    try {
      const activities: Activity[] = []
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Load notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      notifications?.forEach(notif => {
        activities.push({
          id: notif.id,
          type: 'notification',
          title: notif.title,
          description: notif.content,
          timestamp: notif.created_at,
          isNew: !notif.is_read
        })
      })

      // Sort and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setActivities(activities.slice(0, 10))
    } catch (error) {
      handleSupabaseError(error)
      setActivities([])
    }
  }, [])

  const loadExpertStats = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!profile) return

      const { data: proposals } = await supabase
        .from('proposals')
        .select('*, campaigns(title, organization_id)')
        .eq('expert_id', profile.id)

      const pending = proposals?.filter(p => p.status === 'pending').length || 0
      const accepted = proposals?.filter(p => p.status === 'accepted').length || 0
      const rejected = proposals?.filter(p => p.status === 'rejected').length || 0
      const total = proposals?.length || 0

      const responded = accepted + rejected
      const responseRate = total > 0 ? (responded / total) * 100 : 0

      let avgResponseTime = 24
      if (proposals && proposals.length > 0) {
        const responseTimes = proposals
          .filter(p => p.status !== 'pending')
          .map(p => {
            const created = new Date(p.created_at)
            const updated = new Date(p.updated_at)
            return (updated.getTime() - created.getTime()) / (1000 * 60 * 60)
          })
        if (responseTimes.length > 0) {
          avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        }
      }

      setStats({
        totalConnections: total,
        pendingRequests: pending,
        approvedRequests: accepted,
        rejectedRequests: rejected,
        responseRate,
        avgResponseTime,
        profileViews: 0,
        searchAppearances: 0
      })
    } catch (error) {
      handleSupabaseError(error)
    }
  }, [])

  const loadOrganizationStats = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!profile) return

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*, proposals(*)')
        .eq('organization_id', profile.id)

      let totalProposals = 0
      let pendingProposals = 0
      let acceptedProposals = 0
      let rejectedProposals = 0
      let activeCampaignCount = 0

      campaigns?.forEach(campaign => {
        if (campaign.status === 'active' || campaign.status === 'in_progress') {
          activeCampaignCount++
        }
        if (campaign.proposals) {
          totalProposals += campaign.proposals.length
          campaign.proposals.forEach((proposal: any) => {
            if (proposal.status === 'pending') pendingProposals++
            if (proposal.status === 'accepted') acceptedProposals++
            if (proposal.status === 'rejected') rejectedProposals++
          })
        }
      })

      const responseRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0

      const uniqueExperts = new Set()
      campaigns?.forEach(campaign => {
        campaign.proposals?.forEach((proposal: any) => {
          uniqueExperts.add(proposal.expert_id)
        })
      })

      setStats({
        totalConnections: totalProposals,
        pendingRequests: pendingProposals,
        approvedRequests: acceptedProposals,
        rejectedRequests: rejectedProposals,
        responseRate,
        avgResponseTime: 48,
        activeCampaigns: activeCampaignCount,
        totalExperts: uniqueExperts.size
      })
    } catch (error) {
      handleSupabaseError(error)
    }
  }, [])

  const checkAuthAndLoadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      
      if (userData.role === 'expert') {
        await loadExpertStats(user.id)
      } else if (userData.role === 'organization') {
        await loadOrganizationStats(user.id)
      }
      
      await loadRecentActivities(user.id, userData.role)
    }

    setLoading(false)
  }, [router, loadExpertStats, loadOrganizationStats, loadRecentActivities])

  // Memoized chart data
  const statusDistribution = useMemo(() => [
    { name: '승인됨', value: stats.approvedRequests || 0 },
    { name: '대기중', value: stats.pendingRequests || 0 },
    { name: '거절됨', value: stats.rejectedRequests || 0 }
  ], [stats.approvedRequests, stats.pendingRequests, stats.rejectedRequests])

  // Effects
  useEffect(() => {
    checkAuthAndLoadData()
  }, [checkAuthAndLoadData])

  useEffect(() => {
    if (user && userRole) {
      // Load chart data
      setChartData(prev => ({
        ...prev,
        statusDistribution
      }))
    }
  }, [user, userRole, statusDistribution])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <PageErrorBoundary>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {userRole === 'expert' ? '전문가' : '기관'} 대시보드
              </h1>
              <p className="text-gray-600 mt-2">
                실시간 통계와 인사이트를 확인하세요
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <NotificationBadge userId={user?.id || ''} />
              <div className="flex gap-2">
                {(['week', 'month', 'year'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="text-xs sm:text-sm"
                  >
                    {range === 'week' ? '주간' : range === 'month' ? '월간' : '연간'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="전체 연결"
            value={stats.totalConnections}
            icon={Users}
            growth={12.5}
            growthLabel="전월 대비"
          />
          <StatCard
            title="응답률"
            value={`${stats.responseRate.toFixed(1)}%`}
            icon={Activity}
            growth={5.2}
            growthLabel="개선됨"
          />
          <StatCard
            title="평균 응답 시간"
            value={`${stats.avgResponseTime}시간`}
            icon={Clock}
            growth={-2}
            growthLabel="증가"
          />
          {userRole === 'expert' ? (
            <StatCard
              title="프로필 조회수"
              value={stats.profileViews || 0}
              icon={Target}
              growth={18.3}
              growthLabel="증가"
            />
          ) : (
            <StatCard
              title="활성 캠페인"
              value={stats.activeCampaigns || 0}
              icon={Briefcase}
            />
          )}
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="analytics">상세 분석</TabsTrigger>
            <TabsTrigger value="activity">활동 내역</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-7">
              <div className="lg:col-span-4">
                <WidgetErrorBoundary>
                  <StatsChart
                    title="연결 요청 추이"
                    description="시간대별 연결 요청 현황"
                    data={chartData.connectionTrend}
                    type="area"
                    dataKey="connections"
                    xAxisKey="date"
                    height={300}
                  />
                </WidgetErrorBoundary>
              </div>
              <div className="lg:col-span-3">
                <WidgetErrorBoundary>
                  <StatsChart
                    title="요청 상태 분포"
                    description="전체 연결 요청의 상태별 분포"
                    data={statusDistribution}
                    type="pie"
                    dataKey="value"
                    height={300}
                  />
                </WidgetErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>최근 활동 내역</CardTitle>
                <CardDescription>
                  최근 7일간의 주요 활동을 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        formatTimestamp={formatTimestamp}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>최근 활동이 없습니다</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{userRole === 'expert' ? '캠페인 찾기' : '전문가 찾기'}</span>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                {userRole === 'expert' 
                  ? '새로운 프로젝트 기회를 찾아보세요'
                  : '프로젝트에 적합한 전문가를 찾아보세요'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={userRole === 'expert' ? '/dashboard/campaigns/search' : '/dashboard/experts'}>
                  검색하기
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>연결 요청 관리</span>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                대기 중인 요청: {stats.pendingRequests}건
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/connection-requests">
                  관리하기
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>프로필 관리</span>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                프로필을 최신 상태로 유지하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={userRole === 'expert' ? '/profile/expert/edit' : '/dashboard/organization'}>
                  수정하기
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageErrorBoundary>
  )
}