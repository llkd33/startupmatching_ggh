'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { browserSupabase } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { CampaignListSkeleton } from '@/components/ui/loading-states'
import { NoCampaigns, NoSearchResults } from '@/components/ui/empty-state'
import { handleSupabaseError } from '@/lib/error-handler'
import { useCampaigns, type UserRole } from '@/hooks/useCampaigns'
import { useCampaignFilters } from '@/hooks/useCampaignFilters'
import {
  getStatusColor,
  getStatusText,
  getTypeText,
  formatBudget,
  formatDate
} from '@/lib/campaign-helpers'

export default function CampaignsPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Fetch campaigns with pagination
  const {
    campaigns,
    loading: campaignsLoading,
    hasMore,
    loadMore
  } = useCampaigns({
    userId: userId || '',
    role: userRole || 'expert',
    pageSize: 20
  })

  // Filter campaigns
  const {
    filteredCampaigns,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    clearFilters
  } = useCampaignFilters({ campaigns })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await browserSupabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUserId(user.id)

      // Get user role
      const { data: userData, error: userError } = await browserSupabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (userError) {
        handleSupabaseError(userError, false, { context: 'fetch_user_role' })
      }

      const resolvedRole = userData?.role || user.user_metadata?.role || null

      if (resolvedRole) {
        setUserRole(resolvedRole as UserRole)
      }
    } catch (error) {
      handleSupabaseError(error as Error, true, { context: 'auth_check' })
    } finally {
      setAuthLoading(false)
    }
  }

  const loading = authLoading || campaignsLoading

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {userRole === 'organization' ? '내 캠페인' : '캠페인 목록'}
            </h1>
            <p className="text-gray-600 mt-2">
              {userRole === 'organization'
                ? '생성한 캠페인을 관리하세요'
                : '관심있는 캠페인을 찾아보세요'}
            </p>
          </div>
        </div>
        <CampaignListSkeleton />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {userRole === 'organization' ? '내 캠페인' : '캠페인 목록'}
          </h1>
          <p className="text-gray-600 mt-2">
            {userRole === 'organization'
              ? '생성한 캠페인을 관리하세요'
              : '관심있는 캠페인을 찾아보세요'}
          </p>
        </div>
        {userRole === 'organization' && (
          <Button asChild>
            <Link href="/dashboard/campaigns/create">
              <Plus className="h-4 w-4 mr-2" />
              새 캠페인 만들기
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input
                  placeholder="캠페인 제목, 설명, 키워드로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="캠페인 검색"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-md border border-input"
              aria-label="상태 필터"
            >
              <option value="all">모든 상태</option>
              <option value="active">진행중</option>
              <option value="draft">임시저장</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            {campaigns.length === 0 ? (
              userRole === 'organization' ? (
                <NoCampaigns onCreate={() => router.push('/dashboard/campaigns/create')} />
              ) : (
                <NoCampaigns onCreate={() => {}} />
              )
            ) : (
              <NoSearchResults onClear={clearFilters} />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getTypeText(campaign.type)}</Badge>
                        <Badge className={getStatusColor(campaign.status)}>
                          {getStatusText(campaign.status)}
                        </Badge>
                        {campaign.category && (
                          <Badge variant="secondary">{campaign.category}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2">
                        {campaign.description}
                      </CardDescription>
                    </div>
                    {userRole === 'organization' && (
                      <div className="flex gap-2 ml-4" role="group" aria-label="캠페인 작업">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${campaign.title} 상세보기`}
                          asChild
                        >
                          <Link href={`/dashboard/campaigns/${campaign.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">상세보기</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${campaign.title} 수정`}
                          asChild
                        >
                          <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">수정</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${campaign.title} 삭제`}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">삭제</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" aria-hidden="true" />
                      <span>{formatBudget(campaign.budget_min, campaign.budget_max)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      <span>{campaign.required_experts}명 필요</span>
                    </div>
                    {campaign.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        <span>{campaign.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <span>{formatDate(campaign.created_at)}</span>
                    </div>
                  </div>

                  {campaign.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="키워드">
                      {campaign.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          role="listitem"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        상세보기
                      </Link>
                    </Button>
                    {userRole === 'expert' && (
                      <Button asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}/propose`}>
                          제안서 보내기
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={campaignsLoading}
              >
                {campaignsLoading ? '로딩 중...' : '더 보기'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
