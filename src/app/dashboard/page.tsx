'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Briefcase, 
  Users, 
  FileText, 
  PlusCircle,
  Activity,
  MessageSquare,
  Clock
} from 'lucide-react'
import { EnhancedStatCard } from '@/components/dashboard/EnhancedStatCard'
import { NextStepWidget, getNextStepForUser } from '@/components/dashboard/NextStepWidget'
import { ErrorAlert } from '@/components/ui/error-alert'

// 개발 모드 체크
function isDevMode() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('dev_mode') === 'true'
}

export default function FastDashboardPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    campaigns: 0,
    proposals: 0,
    messages: 0,
    connections: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [pageReady, setPageReady] = useState(false)
  const [profileComplete, setProfileComplete] = useState<boolean | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    // 개발 모드 빠른 처리
    if (isDevMode()) {
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

    // 실제 인증 - 최소한의 체크
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // 메타데이터에서 빠르게 가져오기
      const role = session.user.user_metadata?.role || 'expert'
      const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '사용자'
      
      setUserRole(role)
      setUserName(name)
      setUserId(session.user.id)
      setPageReady(true)
      
      // 통계와 프로필 정보는 백그라운드에서 로드
      loadStatsInBackground(session.user.id, role)
      loadProfileStatus(session.user.id, role)
    } catch (error: any) {
      console.error('Init error:', error)
      setError('대시보드를 불러오는 중 오류가 발생했습니다.')
      // 에러가 있어도 기본 UI는 표시
      setPageReady(true)
    }
  }

  const loadProfileStatus = async (userId: string, role: string) => {
    try {
      if (role === 'expert') {
        const { data: profile } = await supabase
          .from('expert_profiles')
          .select('is_profile_complete')
          .eq('user_id', userId)
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
      console.log('Profile status loading skipped:', error)
      // 프로필 상태 로딩 실패는 치명적이지 않음
      setProfileComplete(undefined)
    }
  }

  const loadStatsInBackground = async (userId: string, role: string) => {
    // 300ms 후에 통계 로드 시작 (UI 먼저 표시)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      if (role === 'expert') {
        // 전문가: 제안서, 메시지 카운트
        const [proposalsResult, messagesResult] = await Promise.all([
          supabase
            .from('proposals')
            .select('*', { count: 'exact', head: true })
            .eq('expert_id', userId),
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        ])
        
        setStats(prev => ({
          ...prev,
          proposals: proposalsResult.count || 0,
          messages: messagesResult.count || 0
        }))
      } else {
        // 기관: 캠페인, 제안서, 메시지 카운트
        // 먼저 캠페인 ID 목록 가져오기
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id')
          .eq('organization_id', userId)
        
        const campaignIds = campaigns?.map(c => c.id) || []
        
        const [campaignsResult, proposalsResult, messagesResult] = await Promise.all([
          supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', userId),
          campaignIds.length > 0
            ? supabase
                .from('proposals')
                .select('*', { count: 'exact', head: true })
                .in('campaign_id', campaignIds)
            : Promise.resolve({ count: 0, error: null }),
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        ])
        
        setStats(prev => ({
          ...prev,
          campaigns: campaignsResult.count || 0,
          proposals: proposalsResult.count || 0,
          messages: messagesResult.count || 0
        }))
      }
    } catch (error) {
      console.log('Stats loading skipped:', error)
      setError('통계를 불러오는 중 오류가 발생했습니다.')
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
          <Link href={userRole === 'expert' ? '/dashboard/campaigns' : '/dashboard/campaigns/new'}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {userRole === 'expert' ? '캠페인 찾기' : '새 캠페인'}
          </Link>
        </Button>
      </div>

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