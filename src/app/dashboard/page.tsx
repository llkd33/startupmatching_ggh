'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { 
  Briefcase, 
  Users, 
  FileText, 
  TrendingUp, 
  PlusCircle,
  Activity,
  MessageSquare,
  Clock
} from 'lucide-react'

// 개발 모드 체크
function isDevMode() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('dev_mode') === 'true'
}

// 가벼운 스탯 카드
function StatCard({ title, value, icon: Icon, loading = false }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function FastDashboardPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [stats, setStats] = useState({
    campaigns: 0,
    proposals: 0,
    messages: 0,
    connections: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [pageReady, setPageReady] = useState(false)

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    // 개발 모드 빠른 처리
    if (isDevMode()) {
      const mockUser = JSON.parse(localStorage.getItem('dev_user') || '{}')
      setUserRole(mockUser.role || 'expert')
      setUserName(mockUser.name || '개발자')
      setPageReady(true)
      
      // 가짜 데이터 지연 로드
      setTimeout(() => {
        setStats({
          campaigns: 5,
          proposals: 12,
          messages: 3,
          connections: 24
        })
        setStatsLoading(false)
      }, 300)
      return
    }

    // 실제 인증 - 최소한의 체크
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // 메타데이터에서 빠르게 가져오기
      const role = session.user.user_metadata?.role || 'expert'
      const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '사용자'
      
      setUserRole(role)
      setUserName(name)
      setPageReady(true)
      
      // 통계는 백그라운드에서 로드
      loadStatsInBackground(session.user.id, role)
    } catch (error) {
      console.error('Init error:', error)
      router.push('/auth/login')
    }
  }

  const loadStatsInBackground = async (userId: string, role: string) => {
    // 300ms 후에 통계 로드 시작 (UI 먼저 표시)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      if (role === 'expert') {
        // 전문가: 간단한 카운트만
        const { count: proposalCount } = await supabase
          .from('proposals')
          .select('*', { count: 'exact', head: true })
          .eq('expert_id', userId)
        
        setStats(prev => ({ ...prev, proposals: proposalCount || 0 }))
      } else {
        // 기관: 간단한 카운트만
        const { count: campaignCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', userId)
        
        setStats(prev => ({ ...prev, campaigns: campaignCount || 0 }))
      }
    } catch (error) {
      console.log('Stats loading skipped:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // 페이지 준비 전에는 간단한 로딩만 표시
  if (!pageReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* 헤더 - 즉시 표시 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">안녕하세요, {userName}님!</h1>
          <p className="text-muted-foreground">
            {userRole === 'expert' ? '전문가' : '기관'} 대시보드
          </p>
        </div>
        <Button asChild>
          <Link href={userRole === 'expert' ? '/dashboard/campaigns' : '/dashboard/campaigns/new'}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {userRole === 'expert' ? '캠페인 찾기' : '새 캠페인'}
          </Link>
        </Button>
      </div>

      {/* 통계 카드 - 스켈레톤과 함께 즉시 표시 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={userRole === 'expert' ? '진행 중 제안' : '활성 캠페인'}
          value={userRole === 'expert' ? stats.proposals : stats.campaigns}
          icon={Briefcase}
          loading={statsLoading}
        />
        <StatCard 
          title="새 메시지" 
          value={stats.messages}
          icon={MessageSquare}
          loading={statsLoading}
        />
        <StatCard 
          title="연결" 
          value={stats.connections}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard 
          title="이번 달 활동" 
          value={statsLoading ? '-' : '활발'}
          icon={Activity}
          loading={statsLoading}
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
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/proposals">
                    <FileText className="mr-2 h-4 w-4" />
                    내 제안서 관리
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    메시지 확인
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/campaigns/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    새 캠페인 만들기
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/campaigns">
                    <Briefcase className="mr-2 h-4 w-4" />
                    캠페인 관리
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/proposals">
                    <FileText className="mr-2 h-4 w-4" />
                    받은 제안서
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>도움말</CardTitle>
            <CardDescription>시작하는 데 도움이 필요하신가요?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">🚀 빠른 팁</h4>
              <p className="text-sm text-muted-foreground">
                {userRole === 'expert' 
                  ? '프로필을 완성하면 더 많은 캠페인에 매칭될 수 있어요!'
                  : '명확한 캠페인 설명이 좋은 전문가를 유치합니다!'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">📊 성과 향상</h4>
              <p className="text-sm text-muted-foreground">
                {userRole === 'expert'
                  ? '빠른 응답이 선택 확률을 높입니다.'
                  : '전문가와 적극적으로 소통해보세요.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}