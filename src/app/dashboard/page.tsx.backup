'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Briefcase, Users, FileText, TrendingUp, Bell, UserCheck } from 'lucide-react'
import NotificationBadge from '@/components/notifications/NotificationBadge'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    connectionRequests: 0,
    matchRate: 0,
    completedConnections: 0,
  })
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

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
    // Get expert profile
    const { data: profile } = await supabase
      .from('expert_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) return

    // Get connection request stats
    const { count: requestCount } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', profile.id)

    const { count: approvedCount } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', profile.id)
      .eq('status', 'approved')

    const { count: pendingCount } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', profile.id)
      .eq('status', 'pending')

    setStats({
      activeCampaigns: pendingCount || 0,
      connectionRequests: requestCount || 0,
      matchRate: requestCount ? ((approvedCount || 0) / requestCount * 100) : 0,
      completedConnections: approvedCount || 0,
    })
  }

  const loadOrganizationStats = async (userId: string) => {
    // Get organization profile
    const { data: profile } = await supabase
      .from('organization_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) return

    // Get campaign stats
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.id)

    // Get connection request stats
    const { count: requestCount } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.id)

    const { count: approvedCount } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.id)
      .eq('status', 'approved')

    setStats({
      activeCampaigns: campaignCount || 0,
      connectionRequests: requestCount || 0,
      matchRate: requestCount ? ((approvedCount || 0) / requestCount * 100) : 0,
      completedConnections: approvedCount || 0,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">
            {userRole === 'expert' ? '전문가' : '기관'} 대시보드
          </h1>
          <p className="text-gray-600 mt-2">
            {userRole === 'expert' 
              ? '연결 요청과 매칭 현황을 관리하세요.'
              : '캠페인과 전문가 연결을 관리하세요.'}
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <NotificationBadge userId={user.id} />
            <Button asChild variant="outline">
              <Link href="/dashboard/notifications">
                <Bell className="h-4 w-4 mr-2" />
                알림 센터
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === 'expert' ? '대기중인 요청' : '활성 캠페인'}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'expert' ? '검토 대기 중' : '현재 진행 중'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === 'expert' ? '받은 연결 요청' : '보낸 연결 요청'}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connectionRequests}</div>
            <p className="text-xs text-muted-foreground">
              전체 연결 요청
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matchRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'expert' ? '수락한 비율' : '승인받은 비율'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">성공한 연결</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedConnections}</div>
            <p className="text-xs text-muted-foreground">
              승인된 연결
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userRole === 'expert' ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>캠페인 찾기</CardTitle>
                <CardDescription>
                  전문 분야에 맞는 새로운 캠페인을 찾아보세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/dashboard/campaigns/search">캠페인 둘러보기</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>연결 요청 관리</CardTitle>
                <CardDescription>
                  받은 연결 요청을 검토하고 응답하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/connection-requests">요청 관리</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>내 프로필</CardTitle>
                <CardDescription>
                  프로필을 업데이트하고 전문성을 강화하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/profile/expert/edit">프로필 관리</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>전문가 찾기</CardTitle>
                <CardDescription>
                  프로젝트에 적합한 전문가를 찾아보세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/dashboard/experts">전문가 검색</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>연결 요청 현황</CardTitle>
                <CardDescription>
                  보낸 연결 요청의 현황을 확인하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/connection-requests">요청 현황</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>새 캠페인</CardTitle>
                <CardDescription>
                  새로운 캠페인을 생성하여 전문가를 모집하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/campaigns/create">캠페인 생성</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>
            최근 알림과 연결 요청 현황을 확인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">알림 센터</p>
                  <p className="text-sm text-gray-600">
                    새로운 알림이 있는지 확인하세요
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/notifications">확인하기</Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">연결 요청</p>
                  <p className="text-sm text-gray-600">
                    {userRole === 'expert' 
                      ? '받은 연결 요청을 검토하고 응답하세요'
                      : '보낸 연결 요청의 현황을 확인하세요'
                    }
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/connection-requests">관리하기</Link>
              </Button>
            </div>
            
            {userRole === 'organization' && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">전문가 검색</p>
                    <p className="text-sm text-gray-600">
                      새로운 전문가를 찾아 연결 요청을 보내세요
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/experts">검색하기</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}