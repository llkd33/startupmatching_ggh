'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { CompactBookmarkButton } from '@/components/ui/bookmark-button'
import {
  Bookmark,
  Briefcase,
  User,
  Building2,
  ExternalLink,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react'
import { BookmarkType, useBookmarks } from '@/hooks/useBookmarks'

interface BookmarkedCampaign {
  id: string
  title: string
  industry: string
  budget_min: number
  budget_max: number
  status: string
  deadline: string
  created_at: string
}

interface BookmarkedExpert {
  id: string
  user_id: string
  name: string
  specialty: string
  bio: string
  skills: string[]
  service_regions: string[]
}

export default function BookmarksPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BookmarkType>('campaign')
  const [campaigns, setCampaigns] = useState<BookmarkedCampaign[]>([])
  const [experts, setExperts] = useState<BookmarkedExpert[]>([])
  const [loading, setLoading] = useState(true)

  const { bookmarks, refresh } = useBookmarks({
    userId: userId || '',
    targetType: activeTab
  })

  useEffect(() => {
    const loadUser = async () => {
      const user = await auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)
    }
    loadUser()
  }, [router])

  useEffect(() => {
    if (!userId || bookmarks.length === 0) {
      setCampaigns([])
      setExperts([])
      setLoading(false)
      return
    }

    const loadBookmarkedItems = async () => {
      setLoading(true)

      try {
        if (activeTab === 'campaign') {
          const campaignIds = bookmarks
            .filter(b => b.target_type === 'campaign')
            .map(b => b.target_id)

          if (campaignIds.length > 0) {
            const { data } = await supabase
              .from('campaigns')
              .select('id, title, industry, budget_min, budget_max, status, deadline, created_at')
              .in('id', campaignIds)

            setCampaigns(data || [])
          } else {
            setCampaigns([])
          }
        } else if (activeTab === 'expert') {
          const expertIds = bookmarks
            .filter(b => b.target_type === 'expert')
            .map(b => b.target_id)

          if (expertIds.length > 0) {
            const { data } = await supabase
              .from('expert_profiles')
              .select('id, user_id, name, specialty, bio, skills, service_regions')
              .in('id', expertIds)

            setExperts(data || [])
          } else {
            setExperts([])
          }
        }
      } catch (err) {
        console.error('Failed to load bookmarked items:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBookmarkedItems()
  }, [userId, bookmarks, activeTab])

  const formatBudget = (min: number, max: number) => {
    const formatNum = (n: number) => {
      if (n >= 100000000) return `${(n / 100000000).toFixed(0)}억`
      if (n >= 10000) return `${(n / 10000).toFixed(0)}만`
      return n.toString()
    }
    return `${formatNum(min)} ~ ${formatNum(max)}원`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: '모집중', variant: 'default' },
      in_progress: { label: '진행중', variant: 'secondary' },
      closed: { label: '마감', variant: 'outline' },
      completed: { label: '완료', variant: 'outline' }
    }
    const { label, variant } = statusMap[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={variant}>{label}</Badge>
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bookmark className="h-6 w-6" />
          북마크
        </h1>
        <p className="text-muted-foreground mt-1">
          저장한 캠페인과 전문가를 확인하세요
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookmarkType)}>
        <TabsList className="mb-6">
          <TabsTrigger value="campaign" className="min-h-[44px] px-4">
            <Briefcase className="h-4 w-4 mr-2" />
            캠페인
          </TabsTrigger>
          <TabsTrigger value="expert" className="min-h-[44px] px-4">
            <User className="h-4 w-4 mr-2" />
            전문가
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              type="campaigns"
              title="저장된 캠페인이 없습니다"
              description="관심 있는 캠페인을 북마크에 추가해보세요"
              action={{
                label: '캠페인 둘러보기',
                onClick: () => router.push('/dashboard/campaigns/search')
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                          {campaign.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(campaign.status)}
                          <Badge variant="outline">{campaign.industry}</Badge>
                        </div>
                      </div>
                      <CompactBookmarkButton
                        userId={userId}
                        targetId={campaign.id}
                        targetType="campaign"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatBudget(campaign.budget_min, campaign.budget_max)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>마감: {formatDate(campaign.deadline)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expert">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : experts.length === 0 ? (
            <EmptyState
              type="users"
              title="저장된 전문가가 없습니다"
              description="협업하고 싶은 전문가를 북마크에 추가해보세요"
              action={{
                label: '전문가 찾기',
                onClick: () => router.push('/dashboard/experts')
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {experts.map((expert) => (
                <Card
                  key={expert.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/dashboard/experts/${expert.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                          {expert.name || '이름 없음'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {expert.specialty || '전문 분야 미설정'}
                        </p>
                      </div>
                      <CompactBookmarkButton
                        userId={userId}
                        targetId={expert.id}
                        targetType="expert"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {expert.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {expert.bio}
                      </p>
                    )}
                    {expert.skills && expert.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {expert.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {expert.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{expert.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    {expert.service_regions && expert.service_regions.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{expert.service_regions.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
