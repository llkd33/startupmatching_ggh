'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string
  title: string
  description: string
  type: string
  category: string
  keywords: string[]
  budget_min: number | null
  budget_max: number | null
  start_date: string | null
  end_date: string | null
  location: string | null
  required_experts: number
  status: string
  created_at: string
}

export default function CampaignsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadCampaigns()
  }, [])

  useEffect(() => {
    filterCampaigns()
  }, [campaigns, searchTerm, statusFilter])

  const checkAuthAndLoadCampaigns = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUserId(user.id)

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      await loadCampaigns(user.id, userData.role)
    }
  }

  const loadCampaigns = async (userId: string, role: string) => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (role === 'organization') {
        // For organizations, show their own campaigns
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (orgProfile) {
          query = query.eq('organization_id', orgProfile.id)
        }
      }
      // For experts, show all active campaigns

      const { data, error } = await query

      if (error) throw error

      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCampaigns = () => {
    let filtered = campaigns

    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.keywords.some(keyword =>
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter)
    }

    setFilteredCampaigns(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행중'
      case 'draft': return '임시저장'
      case 'completed': return '완료'
      case 'cancelled': return '취소됨'
      default: return status
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'mentoring': return '멘토링/강의'
      case 'investment': return '투자 매칭'
      case 'service': return '서비스 아웃소싱'
      default: return type
    }
  }

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return '예산 미정'
    if (min && max) return `₩${min.toLocaleString()} - ₩${max.toLocaleString()}`
    if (min) return `₩${min.toLocaleString()}+`
    if (max) return `~₩${max.toLocaleString()}`
    return '예산 미정'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">캠페인을 불러오는 중...</p>
          </div>
        </div>
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
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="캠페인 제목, 설명, 키워드로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input"
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
          <CardContent className="text-center py-12">
            <div className="text-gray-500">
              {campaigns.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">
                    {userRole === 'organization' ? '아직 생성한 캠페인이 없습니다' : '캠페인이 없습니다'}
                  </h3>
                  <p className="text-sm">
                    {userRole === 'organization' 
                      ? '첫 번째 캠페인을 만들어보세요'
                      : '새로운 캠페인이 곧 등록될 예정입니다'}
                  </p>
                  {userRole === 'organization' && (
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/campaigns/create">
                        캠페인 만들기
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
                  <p className="text-sm">다른 키워드로 검색해보세요</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
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
                    <div className="flex gap-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    {formatBudget(campaign.budget_min, campaign.budget_max)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    {campaign.required_experts}명 필요
                  </div>
                  {campaign.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {campaign.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                </div>

                {campaign.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  {userRole === 'expert' ? (
                    <Button>제안서 보내기</Button>
                  ) : (
                    <Button variant="outline">상세보기</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}