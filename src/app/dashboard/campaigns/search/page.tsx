'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Filter,
  Calendar, 
  DollarSign, 
  Users, 
  MapPin,
  Eye,
  Send,
  Clock,
  Building,
  Target
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
  organization_name?: string
  match_score?: number
}

interface SearchFilters {
  keywords: string
  type: string
  location: string
  minBudget: number | null
  maxBudget: number | null
  status: string
}

export default function CampaignSearchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [expertProfile, setExpertProfile] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState<SearchFilters>({
    keywords: '',
    type: 'all',
    location: '',
    minBudget: null,
    maxBudget: null,
    status: 'active'
  })

  useEffect(() => {
    checkAuthAndLoadCampaigns()
  }, [])

  useEffect(() => {
    filterCampaigns()
  }, [campaigns, filters])

  const checkAuthAndLoadCampaigns = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      
      if (userData.role === 'expert') {
        // Load expert profile for matching
        const { data: profile } = await supabase
          .from('expert_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        setExpertProfile(profile)
      }
      
      await loadCampaigns()
    }
  }

  const loadCampaigns = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles!inner(name)
        `)
        .eq('status', 'active') // Only show active campaigns
        .order('created_at', { ascending: false })

      if (error) throw error

      const campaignsWithOrgName = data.map(campaign => ({
        ...campaign,
        organization_name: campaign.organization_profiles?.name || 'Unknown Organization'
      }))

      setCampaigns(campaignsWithOrgName || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCampaigns = () => {
    let filtered = campaigns

    // Keywords filter
    if (filters.keywords.trim()) {
      const keywords = filters.keywords.toLowerCase()
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(keywords) ||
        campaign.description.toLowerCase().includes(keywords) ||
        campaign.category.toLowerCase().includes(keywords) ||
        campaign.keywords.some(keyword => keyword.toLowerCase().includes(keywords)) ||
        campaign.organization_name?.toLowerCase().includes(keywords)
      )
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(campaign => campaign.type === filters.type)
    }

    // Location filter
    if (filters.location.trim()) {
      filtered = filtered.filter(campaign =>
        campaign.location?.toLowerCase().includes(filters.location.toLowerCase())
      )
    }

    // Budget filters
    if (filters.minBudget) {
      filtered = filtered.filter(campaign => 
        campaign.budget_min && campaign.budget_min >= filters.minBudget!
      )
    }
    if (filters.maxBudget) {
      filtered = filtered.filter(campaign => 
        campaign.budget_max && campaign.budget_max <= filters.maxBudget!
      )
    }

    // Calculate match scores for experts
    if (expertProfile) {
      filtered = filtered.map(campaign => ({
        ...campaign,
        match_score: calculateMatchScore(campaign, expertProfile)
      })).sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
    }

    setFilteredCampaigns(filtered)
  }

  const calculateMatchScore = (campaign: Campaign, expert: any) => {
    let score = 0
    
    // Keyword matching (40%)
    const campaignKeywords = [...campaign.keywords, campaign.category.toLowerCase()]
    const expertKeywords = [...expert.skills.map((s: string) => s.toLowerCase()), 
                           ...expert.hashtags.map((h: string) => h.toLowerCase())]
    
    const keywordMatches = campaignKeywords.filter(ck => 
      expertKeywords.some(ek => ek.includes(ck) || ck.includes(ek))
    ).length
    
    score += Math.min(keywordMatches / campaignKeywords.length, 1) * 40

    // Location matching (20%)
    if (campaign.location && expert.location) {
      if (campaign.location.toLowerCase().includes(expert.location.toLowerCase()) ||
          expert.location.toLowerCase().includes(campaign.location.toLowerCase())) {
        score += 20
      }
    }

    // Experience level (20%)
    if (expert.experience_years >= 5) score += 20
    else if (expert.experience_years >= 3) score += 15
    else if (expert.experience_years >= 1) score += 10

    // Rating and reliability (20%)
    if (expert.rating_average >= 4.5) score += 20
    else if (expert.rating_average >= 4.0) score += 15
    else if (expert.rating_average >= 3.5) score += 10

    return Math.round(score)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
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

  if (userRole !== 'expert') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">접근 권한이 없습니다</h3>
            <p className="text-gray-600 mb-4">이 페이지는 전문가만 이용할 수 있습니다.</p>
            <Button asChild>
              <Link href="/dashboard">대시보드로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">캠페인 찾기</h1>
          <p className="text-gray-600 mt-2">
            내 전문성에 맞는 프로젝트를 찾아보세요
          </p>
        </div>
        <div className="text-sm text-gray-500">
          총 {filteredCampaigns.length}개의 캠페인
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Main search */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="캠페인 제목, 설명, 키워드로 검색..."
                    value={filters.keywords}
                    onChange={(e) => handleFilterChange('keywords', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                상세 필터
              </Button>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <Label htmlFor="type">캠페인 유형</Label>
                  <select
                    id="type"
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">전체</option>
                    <option value="mentoring">멘토링/강의</option>
                    <option value="investment">투자 매칭</option>
                    <option value="service">서비스 아웃소싱</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="location">지역</Label>
                  <Input
                    id="location"
                    placeholder="예: 서울"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="minBudget">최소 예산</Label>
                  <Input
                    id="minBudget"
                    type="number"
                    placeholder="1000000"
                    value={filters.minBudget || ''}
                    onChange={(e) => handleFilterChange('minBudget', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="maxBudget">최대 예산</Label>
                  <Input
                    id="maxBudget"
                    type="number"
                    placeholder="10000000"
                    value={filters.maxBudget || ''}
                    onChange={(e) => handleFilterChange('maxBudget', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500">
              <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
              <p className="text-sm">다른 키워드나 필터로 검색해보세요</p>
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
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{getTypeText(campaign.type)}</Badge>
                      <Badge variant="secondary">{campaign.category}</Badge>
                      {campaign.match_score && expertProfile && (
                        <Badge className="bg-green-100 text-green-800">
                          매치율 {campaign.match_score}%
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
                    <CardDescription className="text-sm line-clamp-2 mb-3">
                      {campaign.description}
                    </CardDescription>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{campaign.organization_name}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      제안서 보내기
                    </Button>
                  </div>
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
                    {formatDate(campaign.created_at)}
                  </div>
                </div>

                {/* Project timeline */}
                {(campaign.start_date || campaign.end_date) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="h-4 w-4" />
                    <span>
                      {campaign.start_date && `시작: ${formatDate(campaign.start_date)}`}
                      {campaign.start_date && campaign.end_date && ' ~ '}
                      {campaign.end_date && `종료: ${formatDate(campaign.end_date)}`}
                    </span>
                  </div>
                )}

                {/* Keywords */}
                {campaign.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}