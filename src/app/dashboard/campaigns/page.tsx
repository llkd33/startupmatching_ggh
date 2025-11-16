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
  Trash2,
  Copy,
  BarChart3,
  FileText,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { CampaignListSkeleton } from '@/components/ui/loading-states'
import { NoCampaigns, NoSearchResults } from '@/components/ui/empty-state'
import { handleSupabaseError } from '@/lib/error-handler'
import { useCampaigns, type UserRole } from '@/hooks/useCampaigns'
import { useCampaignFilters } from '@/hooks/useCampaignFilters'
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getStatusColor,
  getStatusText,
  getTypeText,
  formatBudget,
  formatDate
} from '@/lib/campaign-helpers'
import { toast } from '@/components/ui/toast-custom'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function CampaignsPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [campaignToClose, setCampaignToClose] = useState<string | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  // Fetch campaigns with pagination
  const {
    campaigns,
    loading: campaignsLoading,
    hasMore,
    loadMore,
    refresh: refreshCampaigns
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

  const handleDeleteClick = (campaignId: string, campaignTitle: string) => {
    setCampaignToDelete(campaignId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete || !userId) return

    setIsDeleting(true)
    try {
      // organization_profile의 id 조회
      const { data: orgProfile, error: orgError } = await browserSupabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (orgError) throw orgError
      if (!orgProfile) {
        toast.error('조직 프로필을 찾을 수 없습니다.')
        setDeleteDialogOpen(false)
        setCampaignToDelete(null)
        return
      }

      // 관련 제안서 확인
      const { data: proposals } = await browserSupabase
        .from('proposals')
        .select('id')
        .eq('campaign_id', campaignToDelete)
        .limit(1)

      if (proposals && proposals.length > 0) {
        toast.error('제안서가 있는 캠페인은 삭제할 수 없습니다.')
        setDeleteDialogOpen(false)
        setCampaignToDelete(null)
        return
      }

      // 캠페인 삭제 (soft delete)
      const { error } = await browserSupabase
        .from('campaigns')
        .update({
          status: 'cancelled',
          deleted_at: new Date().toISOString()
        })
        .eq('id', campaignToDelete)
        .eq('organization_id', orgProfile.id)

      if (error) throw error

      toast.success('캠페인이 삭제되었습니다.')
      setDeleteDialogOpen(false)
      setCampaignToDelete(null)

      // 캠페인 목록 새로고침
      await refreshCampaigns()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Delete campaign error:', error)
      }
      handleSupabaseError(error as Error, true, { context: 'delete_campaign' })
      toast.error('캠페인 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseClick = (campaignId: string) => {
    setCampaignToClose(campaignId)
    setCloseDialogOpen(true)
  }

  const handleCloseConfirm = async () => {
    if (!campaignToClose || !userId) return

    setIsClosing(true)
    try {
      // organization_profile의 id 조회
      const { data: orgProfile, error: orgError } = await browserSupabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (orgError) throw orgError
      if (!orgProfile) {
        toast.error('조직 프로필을 찾을 수 없습니다.')
        setCloseDialogOpen(false)
        setCampaignToClose(null)
        return
      }

      // 캠페인 종료 (상태를 completed로 변경)
      // 제안서가 있어도 종료 가능
      const { error } = await browserSupabase
        .from('campaigns')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignToClose)
        .eq('organization_id', orgProfile.id)

      if (error) throw error

      toast.success('캠페인이 종료되었습니다.')
      setCloseDialogOpen(false)
      setCampaignToClose(null)

      // 캠페인 목록 새로고침
      await refreshCampaigns()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Close campaign error:', error)
      }
      handleSupabaseError(error as Error, true, { context: 'close_campaign' })
      toast.error('캠페인 종료에 실패했습니다.')
    } finally {
      setIsClosing(false)
    }
  }

  const handleDuplicateCampaign = async (campaignId: string) => {
    if (!userId || isDuplicating) return

    if (!confirm('이 캠페인을 복제하시겠습니까?')) return

    setIsDuplicating(true)
    try {
      // organization_profile의 id 조회
      const { data: orgProfile, error: orgError } = await browserSupabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (orgError) throw orgError
      if (!orgProfile) {
        toast.error('조직 프로필을 찾을 수 없습니다.')
        return
      }

      // 원본 캠페인 데이터 가져오기
      const { data: originalCampaign, error: fetchError } = await browserSupabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (fetchError) throw fetchError

      // 새 캠페인 데이터 생성
      const duplicatedCampaign = {
        title: `${originalCampaign.title} (복사본)`,
        description: originalCampaign.description,
        type: originalCampaign.type,
        category: originalCampaign.category,
        keywords: originalCampaign.keywords,
        budget_min: originalCampaign.budget_min,
        budget_max: originalCampaign.budget_max,
        start_date: null, // 날짜는 새로 설정하도록
        end_date: null,
        location: originalCampaign.location,
        required_experts: originalCampaign.required_experts,
        organization_id: orgProfile.id,
        status: 'draft' // 복제된 캠페인은 임시저장 상태로
      }

      const { data: newCampaign, error: createError } = await browserSupabase
        .from('campaigns')
        .insert([duplicatedCampaign])
        .select()
        .single()

      if (createError) throw createError

      toast.success('캠페인이 복제되었습니다. 수정하여 게시하세요.')

      // 복제된 캠페인 수정 페이지로 이동
      router.push(`/dashboard/campaigns/${newCampaign.id}/edit`)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Duplicate campaign error:', error)
      }
      handleSupabaseError(error as Error, true, { context: 'duplicate_campaign' })
      toast.error('캠페인 복제에 실패했습니다.')
    } finally {
      setIsDuplicating(false)
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
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as any)}
            >
              <SelectTrigger className="min-h-[44px] md:min-h-0" aria-label="상태 필터">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">진행중</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="cancelled">취소됨</SelectItem>
              </SelectContent>
            </Select>
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
                          className="md:h-9 h-11 min-h-[44px] md:min-h-0"
                          aria-label={`${campaign.title} 제안서 보기`}
                          asChild
                        >
                          <Link href={`/dashboard/campaigns/${campaign.id}`}>
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only md:inline ml-1">제안서</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="md:h-9 h-11 min-h-[44px] md:min-h-0"
                          aria-label={`${campaign.title} 수정`}
                          asChild
                        >
                          <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                            <Edit className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only md:inline ml-1">수정</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="md:h-9 h-11 min-h-[44px] md:min-h-0"
                          aria-label={`${campaign.title} 복제`}
                          onClick={() => handleDuplicateCampaign(campaign.id)}
                          disabled={isDuplicating}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only md:inline ml-1">복제</span>
                        </Button>
                        {campaign.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="md:h-9 h-11 min-h-[44px] md:min-h-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            aria-label={`${campaign.title} 종료`}
                            onClick={() => handleCloseClick(campaign.id)}
                            disabled={isClosing}
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only md:inline ml-1">종료</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="md:h-9 h-11 min-h-[44px] md:min-h-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={`${campaign.title} 삭제`}
                          onClick={() => handleDeleteClick(campaign.id, campaign.title)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only md:inline ml-1">삭제</span>
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

      {/* 종료 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={closeDialogOpen}
        onClose={() => {
          setCloseDialogOpen(false)
          setCampaignToClose(null)
        }}
        onConfirm={handleCloseConfirm}
        title="캠페인 종료"
        message="이 캠페인을 종료하시겠습니까? 종료된 캠페인은 더 이상 제안서를 받지 않습니다. 인원이 다 차지 않아도 종료할 수 있습니다."
        type="warning"
        confirmText="종료"
        cancelText="취소"
        loading={isClosing}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setCampaignToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="캠페인 삭제"
        message="정말 이 캠페인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        type="danger"
        confirmText="삭제"
        cancelText="취소"
        loading={isDeleting}
      />
    </div>
  )
}
