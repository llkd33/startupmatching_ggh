'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Calendar, DollarSign, MapPin, Briefcase, ChevronRight, Star, Users, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import { useToast } from '@/components/ui/toast-provider'
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'
import { FilterStatusBar } from '@/components/search/FilterStatusBar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface Campaign {
  id: string
  title: string
  description: string
  budget: number
  deadline: string
  status: string
  organization_profiles: {
    company_name: string
    industry: string
    logo_url?: string
  }
  required_skills: string[]
  created_at: string
  proposals_count?: number
  urgency?: 'low' | 'medium' | 'high'
  match_score?: number
}

interface SearchSuggestion {
  id: string
  text: string
  type: 'expert' | 'skill' | 'company' | 'recent' | 'trending'
  metadata?: {
    count?: number
  }
}

export default function EnhancedCampaignSearchPage() {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('all')
  const [selectedBudget, setSelectedBudget] = useState('all')
  const [selectedUrgency, setSelectedUrgency] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'budget' | 'deadline' | 'match'>('newest')
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Search history and trending
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [trendingSearches] = useState<string[]>([
    'React Developer',
    'Full Stack',
    'Mobile App Development',
    'AI/ML Engineer',
    'UI/UX Designer'
  ])

  useEffect(() => {
    loadCampaigns()
    loadRecentSearches()
  }, [])

  useEffect(() => {
    filterAndSortCampaigns()
  }, [searchTerm, selectedIndustry, selectedBudget, selectedUrgency, sortBy, campaigns])

  const loadRecentSearches = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentSearches')
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    }
  }

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles (
            company_name,
            industry,
            logo_url
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Add mock data for demonstration
      const enhancedCampaigns = (data || []).map((campaign: any) => ({
        ...campaign,
        proposals_count: Math.floor(Math.random() * 20),
        urgency: calculateUrgency(campaign.deadline || campaign.end_date || new Date().toISOString()),
        match_score: Math.floor(Math.random() * 40) + 60,
        budget: campaign.budget || campaign.budget_max || 0,
        deadline: campaign.deadline || campaign.end_date || new Date().toISOString()
      }))
      
      setCampaigns(enhancedCampaigns)
    } catch (error) {
      console.error('Error loading campaigns:', error)
      showError('캠페인을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const calculateUrgency = (deadline: string): 'low' | 'medium' | 'high' => {
    const daysUntilDeadline = Math.floor(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysUntilDeadline <= 7) return 'high'
    if (daysUntilDeadline <= 14) return 'medium'
    return 'low'
  }

  const filterAndSortCampaigns = () => {
    let filtered = campaigns

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(searchLower) ||
        campaign.description.toLowerCase().includes(searchLower) ||
        campaign.required_skills?.some(skill => 
          skill.toLowerCase().includes(searchLower)
        ) ||
        campaign.organization_profiles?.company_name.toLowerCase().includes(searchLower)
      )
    }

    // Industry filter
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(campaign =>
        campaign.organization_profiles?.industry === selectedIndustry
      )
    }

    // Budget filter
    if (selectedBudget !== 'all') {
      const [min, max] = selectedBudget.split('-').map(Number)
      filtered = filtered.filter(campaign => {
        if (max) {
          return campaign.budget >= min && campaign.budget <= max
        } else {
          return campaign.budget >= min
        }
      })
    }

    // Urgency filter
    if (selectedUrgency !== 'all') {
      filtered = filtered.filter(campaign => campaign.urgency === selectedUrgency)
    }

    // Sort
    switch (sortBy) {
      case 'budget':
        filtered.sort((a, b) => b.budget - a.budget)
        break
      case 'deadline':
        filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        break
      case 'match':
        filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        break
      default: // newest
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    setFilteredCampaigns(filtered)
  }

  const getSuggestions = async (query: string): Promise<SearchSuggestion[]> => {
    // Mock implementation - replace with actual API call
    const suggestions: SearchSuggestion[] = []
    
    // Search in campaigns
    const matchingCampaigns = campaigns.filter(c => 
      c.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3)
    
    matchingCampaigns.forEach(c => {
      suggestions.push({
        id: c.id,
        text: c.title,
        type: 'company',
        metadata: { count: 1 }
      })
    })
    
    // Search in skills
    const allSkills = Array.from(new Set(
      campaigns.flatMap(c => c.required_skills || [])
    ))
    
    const matchingSkills = allSkills.filter(skill => 
      skill.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3)
    
    matchingSkills.forEach(skill => {
      const count = campaigns.filter(c => 
        c.required_skills?.includes(skill)
      ).length
      
      suggestions.push({
        id: `skill-${skill}`,
        text: skill,
        type: 'skill',
        metadata: { count }
      })
    })
    
    return suggestions
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    
    // Save to recent searches
    if (value) {
      const updated = [value, ...recentSearches.filter(s => s !== value)].slice(0, 10)
      setRecentSearches(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updated))
      }
    }
  }

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(budget)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">긴급</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">보통</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800">여유</Badge>
    }
  }

  if (loading) {
    return <LoadingSpinner size="xl" label="캠페인을 불러오는 중..." />
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">캠페인 찾기</h1>
            <p className="text-gray-600">나에게 맞는 프로젝트 기회를 찾아보세요</p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-6 mt-4 md:mt-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{campaigns.length}</p>
              <p className="text-sm text-gray-600">활성 캠페인</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {campaigns.filter(c => c.urgency === 'high').length}
              </p>
              <p className="text-sm text-gray-600">긴급 모집</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <SearchAutocomplete
          placeholder="캠페인명, 기업명, 기술 스택으로 검색..."
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          getSuggestions={getSuggestions}
          recentSearches={recentSearches}
          trendingSearches={trendingSearches}
          className="mb-4"
        />
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="산업 분야" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 산업</SelectItem>
              <SelectItem value="IT">IT/소프트웨어</SelectItem>
              <SelectItem value="Finance">금융</SelectItem>
              <SelectItem value="Healthcare">헬스케어</SelectItem>
              <SelectItem value="Education">교육</SelectItem>
              <SelectItem value="Retail">리테일</SelectItem>
              <SelectItem value="Manufacturing">제조업</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBudget} onValueChange={setSelectedBudget}>
            <SelectTrigger>
              <SelectValue placeholder="예산 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 예산</SelectItem>
              <SelectItem value="0-5000000">500만원 이하</SelectItem>
              <SelectItem value="5000000-10000000">500-1000만원</SelectItem>
              <SelectItem value="10000000-30000000">1000-3000만원</SelectItem>
              <SelectItem value="30000000-50000000">3000-5000만원</SelectItem>
              <SelectItem value="50000000">5000만원 이상</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
            <SelectTrigger>
              <SelectValue placeholder="긴급도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 긴급도</SelectItem>
              <SelectItem value="high">긴급</SelectItem>
              <SelectItem value="medium">보통</SelectItem>
              <SelectItem value="low">여유</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'newest' | 'deadline' | 'budget' | 'match')}>
            <SelectTrigger>
              <SelectValue placeholder="정렬 기준" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="budget">예산 높은순</SelectItem>
              <SelectItem value="deadline">마감 임박순</SelectItem>
              <SelectItem value="match">매칭률순</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('')
              setSelectedIndustry('all')
              setSelectedBudget('all')
              setSelectedUrgency('all')
              setSortBy('newest')
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            초기화
          </Button>
        </div>

        {/* Filter Status Bar */}
        <FilterStatusBar
          activeFilters={[
            ...(searchTerm ? [{
              key: 'search',
              label: '검색어',
              value: searchTerm,
              onRemove: () => setSearchTerm('')
            }] : []),
            ...(selectedIndustry !== 'all' ? [{
              key: 'industry',
              label: '산업',
              value: selectedIndustry,
              onRemove: () => setSelectedIndustry('all')
            }] : []),
            ...(selectedBudget !== 'all' ? [{
              key: 'budget',
              label: '예산',
              value: selectedBudget === '50000000' ? '5000만원 이상' : 
                     selectedBudget.split('-').map(n => `${Number(n) / 10000}만원`).join(' ~ '),
              onRemove: () => setSelectedBudget('all')
            }] : []),
            ...(selectedUrgency !== 'all' ? [{
              key: 'urgency',
              label: '긴급도',
              value: selectedUrgency === 'high' ? '긴급' : selectedUrgency === 'medium' ? '보통' : '여유',
              onRemove: () => setSelectedUrgency('all')
            }] : [])
          ]}
          onClearAll={() => {
            setSearchTerm('')
            setSelectedIndustry('all')
            setSelectedBudget('all')
            setSelectedUrgency('all')
            setSortBy('newest')
          }}
          className="mt-4"
        />

        {/* Results Count and View Toggle */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{filteredCampaigns.length}</span>개의 캠페인이 있습니다
          </p>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              그리드
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              리스트
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign Results */}
      <div className={cn(
        viewMode === 'grid' 
          ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
          : "space-y-4"
      )}>
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => (
            <Card 
              key={campaign.id} 
              className={cn(
                "hover:shadow-lg transition-all hover:-translate-y-1",
                viewMode === 'list' && "flex flex-col md:flex-row"
              )}
            >
              <CardHeader className={cn(
                viewMode === 'list' && "md:flex-1"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {campaign.match_score && campaign.match_score >= 80 && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Star className="w-3 h-3 mr-1" />
                          {campaign.match_score}% 매칭
                        </Badge>
                      )}
                      {getUrgencyBadge(campaign.urgency || 'low')}
                    </div>
                    
                    <CardTitle className="text-xl mb-2 line-clamp-1">
                      {campaign.title}
                    </CardTitle>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {campaign.organization_profiles?.company_name}
                      </span>
                      <Badge variant="outline">
                        {campaign.organization_profiles?.industry}
                      </Badge>
                    </div>
                  </div>
                  
                  <Badge className={cn(
                    "ml-2",
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {campaign.status === 'active' ? '모집중' :
                     campaign.status === 'in_progress' ? '진행중' :
                     '완료'}
                  </Badge>
                </div>
                
                <p className="text-gray-600 line-clamp-2">
                  {campaign.description}
                </p>
              </CardHeader>
              
              <CardContent className={cn(
                viewMode === 'list' && "md:w-80"
              )}>
                {/* Required Skills */}
                {campaign.required_skills && campaign.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.required_skills.slice(0, 4).map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {campaign.required_skills.length > 4 && (
                      <Badge variant="outline">
                        +{campaign.required_skills.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Meta Info */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      예산
                    </span>
                    <span className="font-semibold">{formatBudget(campaign.budget)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      마감일
                    </span>
                    <span className="font-semibold">{formatDate(campaign.deadline)}</span>
                  </div>
                  
                  {campaign.proposals_count !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        지원자
                      </span>
                      <span className="font-semibold">{campaign.proposals_count}명</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button asChild className="w-full">
                  <Link href={`/dashboard/campaigns/${campaign.id}`}>
                    상세보기
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">캠페인을 찾을 수 없습니다</h3>
            <p className="text-gray-600 mb-4">다른 검색어나 필터를 시도해보세요</p>
            
            {trendingSearches.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-3">추천 검색어:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {trendingSearches.map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(term)}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}