'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
    }

    setLoading(false)
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

      // Get connection request stats
      const { data: requests } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('expert_id', profile.id)

      const pending = requests?.filter(r => r.status === 'pending').length || 0
      const approved = requests?.filter(r => r.status === 'approved').length || 0
      const rejected = requests?.filter(r => r.status === 'rejected').length || 0
      const total = requests?.length || 0

      // Calculate response rate and time
      const responded = approved + rejected
      const responseRate = total > 0 ? (responded / total) * 100 : 0

      // Calculate average response time (mock data for now)
      const avgResponseTime = 24 // hours

      // Get profile views (mock data)
      const profileViews = Math.floor(Math.random() * 500) + 100
      const searchAppearances = Math.floor(Math.random() * 1000) + 200

      setStats({
        totalConnections: total,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected,
        responseRate,
        avgResponseTime,
        profileViews,
        searchAppearances
      })
    } catch (error) {
      console.error('Error loading expert stats:', error)
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

      // Get connection request stats
      const { data: requests } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('organization_id', profile.id)

      const pending = requests?.filter(r => r.status === 'pending').length || 0
      const approved = requests?.filter(r => r.status === 'approved').length || 0
      const rejected = requests?.filter(r => r.status === 'rejected').length || 0
      const total = requests?.length || 0

      // Calculate response rate
      const responseRate = total > 0 ? (approved / total) * 100 : 0

      // Mock data for now
      const activeCampaigns = 3
      const totalExperts = 150
      const avgResponseTime = 48

      setStats({
        totalConnections: total,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected,
        responseRate,
        avgResponseTime,
        activeCampaigns,
        totalExperts
      })
    } catch (error) {
      console.error('Error loading organization stats:', error)
    }
  }

  const loadChartData = async () => {
    // Generate mock data based on time range
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365
    
    // Connection trend data
    const connectionTrend = generateTrendData(days)
    
    // Status distribution
    const statusDistribution = [
      { name: '승인됨', value: stats.approvedRequests },
      { name: '대기중', value: stats.pendingRequests },
      { name: '거절됨', value: stats.rejectedRequests }
    ]

    // Monthly activity
    const monthlyActivity = generateMonthlyActivity()

    // Response time data
    const responseTimeData = generateResponseTimeData()

    // Top skills for experts
    const topSkills = userRole === 'expert' ? [
      { name: 'React', value: 85 },
      { name: 'Node.js', value: 78 },
      { name: 'TypeScript', value: 92 },
      { name: 'Python', value: 65 },
      { name: 'AWS', value: 70 }
    ] : undefined

    setChartData({
      connectionTrend,
      statusDistribution,
      monthlyActivity,
      responseTimeData,
      topSkills
    })
  }

  const generateTrendData = (days: number) => {
    const data = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        connections: Math.floor(Math.random() * 10) + 1,
        views: Math.floor(Math.random() * 50) + 10
      })
    }
    
    return data
  }

  const generateMonthlyActivity = () => {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월']
    return months.map(month => ({
      month,
      requests: Math.floor(Math.random() * 20) + 5,
      approved: Math.floor(Math.random() * 15) + 3
    }))
  }

  const generateResponseTimeData = () => {
    return [
      { time: '< 1시간', count: 5 },
      { time: '1-6시간', count: 12 },
      { time: '6-24시간', count: 8 },
      { time: '1-3일', count: 4 },
      { time: '> 3일', count: 2 }
    ]
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">대시보드를 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
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
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${i <= 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="font-medium">
                          {i === 1 && "김개발님이 연결 요청을 승인했습니다"}
                          {i === 2 && "새로운 연결 요청을 받았습니다"}
                          {i === 3 && "프로필이 검색 결과에 노출되었습니다"}
                          {i === 4 && "박매니저님이 메시지를 보냈습니다"}
                          {i === 5 && "프로필 조회수가 100회를 넘었습니다"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {i === 1 && "2시간 전"}
                          {i === 2 && "5시간 전"}
                          {i === 3 && "1일 전"}
                          {i === 4 && "2일 전"}
                          {i === 5 && "3일 전"}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      보기
                    </Button>
                  </div>
                ))}
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
  )
}