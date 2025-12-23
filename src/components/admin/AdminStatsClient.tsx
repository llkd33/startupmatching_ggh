'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Briefcase, FileText, Activity, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { campaignStatusLabel, proposalStatusLabel } from '@/lib/i18n/status'
import { SkeletonCard } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AdminStats {
  userCount: number
  expertCount: number
  organizationCount: number
  campaignCount: number
  proposalCount: number
  activeCampaignCount: number
  acceptedProposalCount: number
  recentCampaigns: any[]
  recentProposals: any[]
  error?: string
}

type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export default function AdminStatsClient() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('인증이 필요합니다.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
      setLastUpdated(new Date())
      if (data.error) {
        setError(data.error)
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err)
      setError(err.message || '통계를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Setup realtime subscriptions
  useEffect(() => {
    fetchStats()

    // Create a single channel for all admin stats updates
    const channel = supabase
      .channel('admin-stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          console.log('Users table changed, refreshing stats...')
          fetchStats()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          console.log('Campaigns table changed, refreshing stats...')
          fetchStats()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals' },
        () => {
          console.log('Proposals table changed, refreshing stats...')
          fetchStats()
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected')
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchStats])

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">오류 발생</h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 min-h-[44px] min-w-[44px]"
        >
          다시 시도
        </button>
      </div>
    )
  }

  // Realtime status indicator
  const RealtimeIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {realtimeStatus === 'connected' ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-muted-foreground">실시간 연결됨</span>
        </>
      ) : realtimeStatus === 'connecting' ? (
        <>
          <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
          <span className="text-muted-foreground">연결 중...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-muted-foreground">연결 끊김</span>
        </>
      )}
      {lastUpdated && (
        <span className="text-xs text-muted-foreground ml-2">
          마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
        </span>
      )}
      <button
        onClick={fetchStats}
        className="p-1.5 hover:bg-muted rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        title="새로고침"
      >
        <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
      </button>
    </div>
  )

  if (!stats) return null

  const statItems = [
    { label: '전체 사용자', value: stats.userCount || 0, icon: Users, color: 'bg-blue-500', href: '/admin/users' },
    { label: '전문가', value: stats.expertCount || 0, icon: Users, color: 'bg-green-500', href: '/admin/users?role=expert' },
    { label: '기관', value: stats.organizationCount || 0, icon: Briefcase, color: 'bg-purple-500', href: '/admin/users?role=organization' },
    { label: '전체 캠페인', value: stats.campaignCount || 0, icon: FileText, color: 'bg-orange-500', href: '/admin/campaigns' },
    { label: '활성 캠페인', value: stats.activeCampaignCount || 0, icon: Activity, color: 'bg-emerald-500', href: '/admin/campaigns?status=active' },
    { label: '전체 제안서', value: stats.proposalCount || 0, icon: FileText, color: 'bg-indigo-500', href: '/admin/proposals' },
    { label: '승인된 제안서', value: stats.acceptedProposalCount || 0, icon: CheckCircle, color: 'bg-teal-500', href: '/admin/proposals?status=accepted' },
  ]

  return (
    <div>
      {/* Header with realtime status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <RealtimeIndicator />
      </div>

      {error && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statItems.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>최근 캠페인</CardTitle>
            <CardDescription>최근 등록된 캠페인 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns && stats.recentCampaigns.length > 0 ? (
              <div className="space-y-4">
                {stats.recentCampaigns.map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{campaign.title}</p>
                      <p className="text-sm text-muted-foreground">
                        by {campaign.organization_profiles?.organization_name || 'Unknown'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
                      campaign.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      campaign.status === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                      campaign.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {campaignStatusLabel(campaign.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">캠페인이 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>최근 제안서</CardTitle>
            <CardDescription>최근 제출된 제안서 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentProposals && stats.recentProposals.length > 0 ? (
              <div className="space-y-4">
                {stats.recentProposals.map((proposal: any) => (
                  <div key={proposal.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {proposal.expert_profiles?.name || 'Unknown Expert'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        for {proposal.campaigns?.title}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      proposal.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      proposal.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      proposal.status === 'withdrawn' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {proposalStatusLabel(proposal.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">제안서가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
