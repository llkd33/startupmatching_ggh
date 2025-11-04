'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Briefcase, 
  FileText, 
  Users,
  DollarSign,
  Activity,
  BarChart3,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface AnalyticsStats {
  totalCampaigns: number
  activeCampaigns: number
  totalProposals: number
  pendingProposals: number
  acceptedProposals: number
  totalBudget: number
  averageProposalValue: number
  campaignsByStatus: { status: string; count: number }[]
  proposalsByStatus: { status: string; count: number }[]
}

export default function DashboardAnalyticsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'expert' | 'organization' | null>(null)

  useEffect(() => {
    loadUserAndAnalytics()
  }, [])

  const loadUserAndAnalytics = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        router.push('/auth/login')
        return
      }

      setUserId(user.id)

      // Get user role
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (roleError) {
        console.error('Error fetching user role:', roleError)
        setError('사용자 정보를 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      const role = (userData?.role || user.user_metadata?.role) as 'expert' | 'organization'
      setUserRole(role)

      // Load analytics based on role
      if (role === 'organization') {
        await loadOrganizationAnalytics(user.id)
      } else {
        await loadExpertAnalytics(user.id)
      }
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const loadOrganizationAnalytics = async (userId: string) => {
    try {
      // Get organization profile
      const { data: orgProfile, error: orgError } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (orgError || !orgProfile) {
        setError('조직 프로필을 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      const orgId = orgProfile.id

      // Fetch campaigns
      const { count: totalCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const { count: activeCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active')

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('status')
        .eq('organization_id', orgId)

      // Fetch proposals
      const { count: totalProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', orgId)

      const { count: pendingProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', [orgId])
        .eq('status', 'pending')

      const { count: acceptedProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', [orgId])
        .eq('status', 'accepted')

      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('status, proposed_budget')
        .in('campaign_id', [orgId])

      // Calculate statistics
      const campaignsByStatus = campaignsData
        ? Object.entries(
            campaignsData.reduce((acc: any, curr: any) => {
              acc[curr.status] = (acc[curr.status] || 0) + 1
              return acc
            }, {})
          ).map(([status, count]) => ({ status, count: count as number }))
        : []

      const proposalsByStatus = proposalsData
        ? Object.entries(
            proposalsData.reduce((acc: any, curr: any) => {
              acc[curr.status] = (acc[curr.status] || 0) + 1
              return acc
            }, {})
          ).map(([status, count]) => ({ status, count: count as number }))
        : []

      const totalBudget = proposalsData
        ? proposalsData.reduce((sum: number, p: any) => sum + (p.proposed_budget || 0), 0)
        : 0

      const averageProposalValue = proposalsData && proposalsData.length > 0
        ? totalBudget / proposalsData.length
        : 0

      setStats({
        totalCampaigns: totalCampaigns || 0,
        activeCampaigns: activeCampaigns || 0,
        totalProposals: totalProposals || 0,
        pendingProposals: pendingProposals || 0,
        acceptedProposals: acceptedProposals || 0,
        totalBudget,
        averageProposalValue,
        campaignsByStatus,
        proposalsByStatus,
      })
    } catch (err) {
      console.error('Error loading organization analytics:', err)
      setError('분석 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadExpertAnalytics = async (userId: string) => {
    try {
      // Get expert profile
      const { data: expertProfile, error: expertError } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (expertError || !expertProfile) {
        setError('전문가 프로필을 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      const expertId = expertProfile.id

      // Fetch proposals
      const { count: totalProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('expert_id', expertId)

      const { count: pendingProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('expert_id', expertId)
        .eq('status', 'pending')

      const { count: acceptedProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('expert_id', expertId)
        .eq('status', 'accepted')

      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('status, proposed_budget')
        .eq('expert_id', expertId)

      // Calculate statistics
      const proposalsByStatus = proposalsData
        ? Object.entries(
            proposalsData.reduce((acc: any, curr: any) => {
              acc[curr.status] = (acc[curr.status] || 0) + 1
              return acc
            }, {})
          ).map(([status, count]) => ({ status, count: count as number }))
        : []

      const totalBudget = proposalsData
        ? proposalsData.reduce((sum: number, p: any) => sum + (p.proposed_budget || 0), 0)
        : 0

      const averageProposalValue = proposalsData && proposalsData.length > 0
        ? totalBudget / proposalsData.length
        : 0

      setStats({
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalProposals: totalProposals || 0,
        pendingProposals: pendingProposals || 0,
        acceptedProposals: acceptedProposals || 0,
        totalBudget,
        averageProposalValue,
        campaignsByStatus: [],
        proposalsByStatus,
      })
    } catch (err) {
      console.error('Error loading expert analytics:', err)
      setError('분석 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>오류 발생</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">분석 대시보드</h1>
        <p className="text-gray-600">
          {userRole === 'organization' ? '조직' : '전문가'} 활동 통계 및 성과 분석
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {userRole === 'organization' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 캠페인</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
                <p className="text-xs text-muted-foreground">
                  활성: {stats.activeCampaigns}개
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 제안서</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProposals}</div>
            <p className="text-xs text-muted-foreground">
              대기: {stats.pendingProposals}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수락된 제안서</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptedProposals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProposals > 0 
                ? `${Math.round((stats.acceptedProposals / stats.totalProposals) * 100)}% 수락률`
                : '제안서 없음'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 제안 금액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageProposalValue > 0 
                ? `₩${Math.round(stats.averageProposalValue).toLocaleString()}`
                : '-'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              총 예산: ₩{stats.totalBudget > 0 ? Math.round(stats.totalBudget).toLocaleString() : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userRole === 'organization' && stats.campaignsByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>캠페인 상태별 분포</CardTitle>
              <CardDescription>캠페인의 상태별 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.campaignsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / stats.totalCampaigns) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {stats.proposalsByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>제안서 상태별 분포</CardTitle>
              <CardDescription>제안서의 상태별 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.proposalsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / stats.totalProposals) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {userRole === 'organization' && (
                <>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/campaigns">캠페인 관리</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/proposals">제안서 관리</Link>
                  </Button>
                </>
              )}
              {userRole === 'expert' && (
                <>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/proposals">내 제안서</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/campaigns/search">캠페인 찾기</Link>
                  </Button>
                </>
              )}
              <Button asChild variant="outline">
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

