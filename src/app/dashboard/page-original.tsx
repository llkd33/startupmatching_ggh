'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  ArrowDownRight,
  Search,
  PlusCircle
} from 'lucide-react'
import StatsChart from '@/components/dashboard/StatsChart'

interface DashboardStats {
  // Common stats
  totalConnections: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  responseRate: number
  avgResponseTime: number
  
  // Expert specific
  profileViews?: number
  searchAppearances?: number
  
  // Organization specific
  activeCampaigns?: number
  totalExperts?: number
}

interface ChartData {
  connectionTrend: any[]
  statusDistribution: any[]
  monthlyActivity: any[]
  topSkills?: any[]
  responseTimeData: any[]
}

interface Activity {
  id: string
  type: 'proposal' | 'message' | 'campaign' | 'notification'
  title: string
  description: string
  timestamp: string
  isNew: boolean
}

export default function EnhancedDashboardPage() {
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
  const [chartData, setChartData] = useState<ChartData>({
    connectionTrend: [],
    statusDistribution: [],
    monthlyActivity: [],
    responseTimeData: []
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  useEffect(() => {
    if (user && userRole) {
      loadChartData()
    }
  }, [timeRange, user, userRole])

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      
      // Load role-specific stats
      if (userData.role === 'expert') {
        await loadExpertStats(user.id)
      } else if (userData.role === 'organization') {
        await loadOrganizationStats(user.id)
      }
      
      // Load recent activities
      await loadRecentActivities(user.id, userData.role)
    }

    setLoading(false)
  }

  const loadRecentActivities = async (userId: string, role: string) => {
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

      // Load messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*, sender:sender_id(email), campaigns(title)')
        .eq('receiver_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      messages?.forEach(msg => {
        activities.push({
          id: msg.id,
          type: 'message',
          title: `새 메시지 from ${msg.sender?.email || 'Unknown'}`,
          description: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
          timestamp: msg.created_at,
          isNew: !msg.is_read
        })
      })

      // Load proposals for experts
      if (role === 'expert') {
        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (expertProfile) {
          const { data: proposals } = await supabase
            .from('proposals')
            .select('*, campaigns(title)')
            .eq('expert_id', expertProfile.id)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5)

          proposals?.forEach((proposal: any) => {
            activities.push({
              id: proposal.id,
              type: 'proposal',
              title: `제안서 ${proposal.status === 'accepted' ? '승인됨' : proposal.status === 'rejected' ? '거절됨' : '제출됨'}`,
              description: `캠페인: ${proposal.campaigns?.title || 'Unknown'}`,
              timestamp: proposal.created_at,
              isNew: proposal.status === 'pending'
            })
          })
        }
      }

      // Load campaigns for organizations
      if (role === 'organization') {
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (orgProfile) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('*, proposals(*)')
            .eq('organization_id', orgProfile.id)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5)

          campaigns?.forEach(campaign => {
            activities.push({
              id: campaign.id,
              type: 'campaign',
              title: `캠페인 "${campaign.title}"`,
              description: `상태: ${campaign.status}, 제안서: ${campaign.proposals?.length || 0}개`,
              timestamp: campaign.created_at,
              isNew: campaign.status === 'active'
            })
          })
        }
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      // Take only the most recent 10 activities
      setActivities(activities.slice(0, 10))
    } catch (error) {
      handleSupabaseError(error)
      setActivities([])
    }
  }

  const loadExpertStats = async (userId: string) => {
    try {
      // Get expert profile
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!profile) return

      // Get proposals stats
      const { data: proposals } = await supabase
        .from('proposals')
        .select('*, campaigns(title, organization_id)')
        .eq('expert_id', profile.id)

      const pending = proposals?.filter(p => p.status === 'pending').length || 0
      const accepted = proposals?.filter(p => p.status === 'accepted').length || 0
      const rejected = proposals?.filter(p => p.status === 'rejected').length || 0
      const withdrawn = proposals?.filter(p => p.status === 'withdrawn').length || 0
      const total = proposals?.length || 0

      // Calculate response rate
      const responded = accepted + rejected
      const responseRate = total > 0 ? (responded / total) * 100 : 0

      // Get messages count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)

      // Get active campaigns count (where expert has accepted proposals)
      const activeCampaigns = proposals?.filter(p => p.status === 'accepted').length || 0

      // Calculate average response time (based on actual data)
      let avgResponseTime = 24
      if (proposals && proposals.length > 0) {
        const responseTimes = proposals
          .filter(p => p.status !== 'pending')
          .map(p => {
            const created = new Date(p.created_at)
            const updated = new Date(p.updated_at)
            return (updated.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
          })
        if (responseTimes.length > 0) {
          avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        }
      }

      // Get notifications count
      const { count: notificationCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      setStats({
        totalConnections: total,
        pendingRequests: pending,
        approvedRequests: accepted,
        rejectedRequests: rejected,
        responseRate,
        avgResponseTime,
        profileViews: 0, // Real data would come from analytics
        searchAppearances: 0 // Real data would come from analytics
      })
    } catch (error) {
      handleSupabaseError(error)
      // Set default stats on error
      setStats(prev => ({ ...prev }))
    }
  }

  const loadOrganizationStats = async (userId: string) => {
    try {
      // Get organization profile
      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!profile) return

      // Get campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*, proposals(*)')
        .eq('organization_id', profile.id)

      // Calculate stats from campaigns and proposals
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

      // Calculate response rate
      const responseRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0

      // Get unique experts who have submitted proposals
      const uniqueExperts = new Set()
      campaigns?.forEach(campaign => {
        campaign.proposals?.forEach((proposal: any) => {
          uniqueExperts.add(proposal.expert_id)
        })
      })

      // Calculate average response time
      let avgResponseTime = 48
      const proposalsWithResponse: any[] = []
      campaigns?.forEach(campaign => {
        campaign.proposals?.forEach((proposal: any) => {
          if (proposal.status !== 'pending') {
            const created = new Date(proposal.created_at)
            const updated = new Date(proposal.updated_at)
            const responseTime = (updated.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
            proposalsWithResponse.push(responseTime)
          }
        })
      })
      
      if (proposalsWithResponse.length > 0) {
        avgResponseTime = Math.round(
          proposalsWithResponse.reduce((a, b) => a + b, 0) / proposalsWithResponse.length
        )
      }

      // Get messages count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)

      setStats({
        totalConnections: totalProposals,
        pendingRequests: pendingProposals,
        approvedRequests: acceptedProposals,
        rejectedRequests: rejectedProposals,
        responseRate,
        avgResponseTime,
        activeCampaigns: activeCampaignCount,
        totalExperts: uniqueExperts.size
      })
    } catch (error) {
      handleSupabaseError(error)
      // Set default stats on error
      setStats(prev => ({ ...prev }))
    }
  }

  const loadChartData = async () => {
    // Get real data for trends
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
      // For experts: get proposals over time
      if (userRole === 'expert' && user) {
        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id, skills')
          .eq('user_id', user.id)
          .single()

        if (expertProfile) {
          // Get proposals created in the time range
          const { data: proposals } = await supabase
            .from('proposals')
            .select('created_at, status')
            .eq('expert_id', expertProfile.id)
            .gte('created_at', startDate.toISOString())

          // Process data for trend chart
          const trendData = processTrendData(proposals || [], days)
          
          // Top skills from profile
          const topSkills = expertProfile.skills ? 
            expertProfile.skills.slice(0, 5).map((skill: any) => ({
              name: skill,
              value: 0 // Real data would come from skill usage analytics
            })) : []

          setChartData(prev => ({
            ...prev,
            connectionTrend: trendData,
            topSkills
          }))
        }
      }

      // For organizations: get campaigns and proposals over time
      if (userRole === 'organization' && user) {
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (orgProfile) {
          // Get campaigns and their proposals
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('created_at, proposals(created_at, status)')
            .eq('organization_id', orgProfile.id)
            .gte('created_at', startDate.toISOString())

          // Process data for trend chart
          const trendData = processCampaignTrendData(campaigns || [], days)
          
          setChartData(prev => ({
            ...prev,
            connectionTrend: trendData
          }))
        }
      }
    } catch (error) {
      handleSupabaseError(error)
      // Set empty chart data on error
      setChartData({
        connectionTrend: [],
        statusDistribution: [],
        monthlyActivity: [],
        responseTimeData: []
      })
    }

    // Status distribution - only show if there's actual data
    const statusDistribution = [
      { name: '승인됨', value: stats.approvedRequests || 0 },
      { name: '대기중', value: stats.pendingRequests || 0 },
      { name: '거절됨', value: stats.rejectedRequests || 0 }
    ]

    // Generate other chart data
    const monthlyActivity = await generateRealMonthlyActivity()
    const responseTimeData = generateResponseTimeData()

    setChartData(prev => ({
      ...prev,
      statusDistribution,
      monthlyActivity,
      responseTimeData
    }))
  }

  const processTrendData = (proposals: any[], days: number) => {
    const data = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayProposals = proposals?.filter(p => 
        p.created_at.startsWith(dateStr)
      ) || []
      
      data.push({
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        connections: dayProposals.length,
        views: 0 // Real view data would come from analytics
      })
    }
    
    return data
  }

  const processCampaignTrendData = (campaigns: any[], days: number) => {
    const data = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      let dayProposals = 0
      campaigns?.forEach(campaign => {
        campaign.proposals?.forEach((proposal: any) => {
          if (proposal.created_at.startsWith(dateStr)) {
            dayProposals++
          }
        })
      })
      
      data.push({
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        connections: dayProposals,
        views: 0 // Real view data would come from analytics
      })
    }
    
    return data
  }

  const generateRealMonthlyActivity = async () => {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월']
    const monthlyData = []
    
    try {
      // Get actual monthly data from database
      if (userRole === 'expert' && user) {
        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (expertProfile) {
          for (let i = 5; i >= 0; i--) {
            const startDate = new Date()
            startDate.setMonth(startDate.getMonth() - i)
            startDate.setDate(1)
            const endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)

            const { data: proposals } = await supabase
              .from('proposals')
              .select('status')
              .eq('expert_id', expertProfile.id)
              .gte('created_at', startDate.toISOString())
              .lt('created_at', endDate.toISOString())

            const requests = proposals?.length || 0
            const approved = proposals?.filter(p => p.status === 'accepted').length || 0

            monthlyData.push({
              month: months[5 - i],
              requests,
              approved
            })
          }
        }
      } else if (userRole === 'organization' && user) {
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (orgProfile) {
          for (let i = 5; i >= 0; i--) {
            const startDate = new Date()
            startDate.setMonth(startDate.getMonth() - i)
            startDate.setDate(1)
            const endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)

            const { data: campaigns } = await supabase
              .from('campaigns')
              .select('proposals(status)')
              .eq('organization_id', orgProfile.id)
              .gte('created_at', startDate.toISOString())
              .lt('created_at', endDate.toISOString())

            let requests = 0
            let approved = 0
            campaigns?.forEach(campaign => {
              requests += campaign.proposals?.length || 0
              approved += campaign.proposals?.filter(p => p.status === 'accepted').length || 0
            })

            monthlyData.push({
              month: months[5 - i],
              requests,
              approved
            })
          }
        }
      }
    } catch (error) {
      handleSupabaseError(error, false) // Don't show toast for chart data
      // Return empty data on error
      for (let i = 0; i < 6; i++) {
        monthlyData.push({
          month: months[i],
          requests: 0,
          approved: 0
        })
      }
    }
    
    return monthlyData.length > 0 ? monthlyData : months.map(month => ({ month, requests: 0, approved: 0 }))
  }


  const generateResponseTimeData = () => {
    // This would need actual response time data from the database
    // For now, return empty data structure
    return [
      { time: '< 1시간', count: 0 },
      { time: '1-6시간', count: 0 },
      { time: '6-24시간', count: 0 },
      { time: '1-3일', count: 0 },
      { time: '> 3일', count: 0 }
    ]
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const formatTimestamp = (timestamp: string) => {
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
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <PageErrorBoundary>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header with Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {userRole === 'expert' ? '전문가' : '기관'} 대시보드
                </h1>
                <p className="text-gray-600 mt-2">
                  실시간 통계와 인사이트를 확인하세요
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Primary CTA Button */}
                {userRole === 'expert' ? (
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/dashboard/campaigns/search">
                      <Search className="w-4 h-4 mr-2" />
                      캠페인 찾기
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/dashboard/campaigns/create">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      새 캠페인 생성
                    </Link>
                  </Button>
                )}
                
                {/* Time Range Filters */}
                <div className="flex gap-2">
                  <Button
                    variant={timeRange === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('week')}
                    className="text-xs sm:text-sm"
                  >
                    주간
                  </Button>
                  <Button
                    variant={timeRange === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('month')}
                    className="text-xs sm:text-sm"
                  >
                    월간
                  </Button>
                  <Button
                    variant={timeRange === 'year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('year')}
                    className="text-xs sm:text-sm"
                  >
                    연간
                  </Button>
                </div>
              </div>
            </div>
          </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              전체 연결
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConnections}</div>
            <div className="flex items-center text-xs">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500">12.5%</span>
              <span className="text-muted-foreground ml-1">전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              응답률
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500">5.2%</span>
              <span className="text-muted-foreground ml-1">개선됨</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              평균 응답 시간
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}시간</div>
            <div className="flex items-center text-xs">
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500">2시간</span>
              <span className="text-muted-foreground ml-1">증가</span>
            </div>
          </CardContent>
        </Card>

        {userRole === 'expert' ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                프로필 조회수
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.profileViews}</div>
              <div className="flex items-center text-xs">
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-500">18.3%</span>
                <span className="text-muted-foreground ml-1">증가</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                활성 캠페인
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground">총 {stats.totalExperts}명 전문가</span>
              </div>
            </CardContent>
          </Card>
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
              <StatsChart
                title="연결 요청 추이"
                description="시간대별 연결 요청 현황"
                data={chartData.connectionTrend}
                type="area"
                dataKey="connections"
                xAxisKey="date"
                height={300}
              />
            </div>
            <div className="lg:col-span-3">
              <StatsChart
                title="요청 상태 분포"
                description="전체 연결 요청의 상태별 분포"
                data={chartData.statusDistribution}
                type="pie"
                dataKey="value"
                height={300}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatsChart
              title="월별 활동 현황"
              description="월별 연결 요청 및 승인 현황"
              data={chartData.monthlyActivity}
              type="bar"
              dataKey="requests"
              xAxisKey="month"
              height={250}
            />
            <StatsChart
              title="응답 시간 분포"
              description="요청에 대한 응답 시간 분포"
              data={chartData.responseTimeData}
              type="bar"
              dataKey="count"
              xAxisKey="time"
              colors={['#8b5cf6']}
              height={250}
            />
          </div>

          {userRole === 'expert' && chartData.topSkills && (
            <StatsChart
              title="인기 기술 스택"
              description="프로필에 등록된 주요 기술의 수요"
              data={chartData.topSkills}
              type="bar"
              dataKey="value"
              xAxisKey="name"
              colors={['#10b981']}
              height={300}
            />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>성과 분석</CardTitle>
              <CardDescription>
                주요 지표의 상세 분석 및 인사이트
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-blue-900">연결 성공률이 향상되고 있습니다</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      지난달 대비 15% 증가한 {stats.responseRate.toFixed(1)}%의 성공률을 기록했습니다.
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-blue-600" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">가장 활발한 시간대</h5>
                    <p className="text-2xl font-bold">오후 2-6시</p>
                    <p className="text-sm text-gray-500">대부분의 연결이 이루어집니다</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">평균 매칭 시간</h5>
                    <p className="text-2xl font-bold">3.5일</p>
                    <p className="text-sm text-gray-500">요청부터 승인까지</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">재연결률</h5>
                    <p className="text-2xl font-bold">68%</p>
                    <p className="text-sm text-gray-500">한 번 이상 재연결</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${activity.isNew ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="font-medium">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimestamp(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        보기
                      </Button>
                    </div>
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

          {/* Quick Actions - Improved layout */}
          <div className="mt-6 sm:mt-8">
            <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {userRole === 'expert' ? (
                <>
                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>캠페인 찾기</span>
                        <Search className="h-4 w-4 text-blue-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">새로운 기회 탐색</p>
                      <Button asChild size="sm" className="w-full">
                        <Link href="/dashboard/campaigns/search">탐색하기</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>내 제안서</span>
                        <FileText className="h-4 w-4 text-green-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">대기중: {stats.pendingRequests}건</p>
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href="/dashboard/proposals">관리하기</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>메시지</span>
                        <Bell className="h-4 w-4 text-orange-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">새 메시지 확인</p>
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href="/dashboard/messages">확인하기</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>프로필</span>
                        <UserCheck className="h-4 w-4 text-purple-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">프로필 업데이트</p>
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href="/profile/expert/edit">수정하기</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>전문가 찾기</span>
                        <Users className="h-4 w-4 text-blue-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">전문가 검색</p>
                      <Button asChild size="sm" className="w-full">
                        <Link href="/dashboard/experts">검색하기</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>캠페인 생성</span>
                        <PlusCircle className="h-4 w-4 text-green-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">새 캠페인 시작</p>
                      <Button asChild size="sm" className="w-full">
                        <Link href="/dashboard/campaigns/create">생성하기</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>제안서 관리</span>
                        <FileText className="h-4 w-4 text-orange-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">대기중: {stats.pendingRequests}건</p>
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href="/dashboard/proposals">관리하기</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>분석</span>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">성과 분석</p>
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href="/dashboard/analytics">보기</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </PageErrorBoundary>
  )
}