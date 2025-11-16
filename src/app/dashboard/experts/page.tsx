'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ConnectionRequestForm from '@/components/expert/ConnectionRequestForm'
import { 
  Search, 
  MapPin, 
  Star, 
  Users, 
  Filter,
  Eye,
  MessageCircle,
  Award,
  Clock,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

interface ExpertProfile {
  id: string
  user_id: string
  name: string
  bio: string
  title: string
  company: string
  location: string
  hourly_rate: number | null
  availability_status: string
  skills: string[]
  hashtags: string[]
  experience_years: number
  education: any[]
  career_history: any[]
  rating_average: number
  total_reviews: number
  completion_rate: number
  response_time_hours: number
  profile_completeness: number
  created_at: string
  updated_at: string
}

interface SearchFilters {
  keywords: string
  location: string
  minRating: number
  maxHourlyRate: number | null
  minHourlyRate: number | null
  availability: string
  experienceYears: number
  skills: string[]
  sortBy: 'rating' | 'experience' | 'hourlyRate' | 'responseTime' | 'completionRate' | 'newest'
  sortOrder: 'asc' | 'desc'
}

export default function ExpertSearchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [experts, setExperts] = useState<ExpertProfile[]>([])
  const [filteredExperts, setFilteredExperts] = useState<ExpertProfile[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [organizationProfile, setOrganizationProfile] = useState<any>(null)
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null)
  const [showConnectionForm, setShowConnectionForm] = useState(false)

  const [filters, setFilters] = useState<SearchFilters>({
    keywords: '',
    location: '',
    minRating: 0,
    maxHourlyRate: null,
    minHourlyRate: null,
    availability: 'all',
    experienceYears: 0,
    skills: [],
    sortBy: 'rating',
    sortOrder: 'desc'
  })

  useEffect(() => {
    checkAuthAndLoadExperts()
  }, [])

  // Debounced filter effect for better performance
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      filterExperts()
    }, 300) // Debounce filtering for better UX
    
    // Log search after a delay to avoid too many logs
    const logTimer = setTimeout(() => {
      if (filters.keywords || filters.location || filters.minRating > 0) {
        logSearch()
      }
    }, 1500)
    
    return () => {
      clearTimeout(debounceTimer)
      clearTimeout(logTimer)
    }
  }, [experts, filters])

  const checkAuthAndLoadExperts = async () => {
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
      
      if (userData.role === 'organization') {
        // Load organization profile
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        setOrganizationProfile(orgProfile)
      }
      
      await loadExperts()
    }
  }

  const loadExperts = async () => {
    setLoading(true)
    
    try {
      // Use the enhanced view with pagination for better performance
      const { data, error } = await supabase
        .from('expert_search_view')
        .select('*')
        // profile_completeness 필터 제거 - 전체 전문가 표시
        .order('rating_average', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(200) // 더 많은 결과 표시

      if (error) throw error

      // Transform the data to match our interface
      const transformedData = (data || []).map(expert => ({
        ...expert,
        skills: expert.skills || [],
        hashtags: expert.hashtags || [],
        career_history: expert.career_history || [],
        education: expert.education || [],
        // Ensure all numeric fields have defaults
        experience_years: expert.experience_years || 0,
        rating_average: expert.rating_average || 0,
        total_reviews: expert.total_reviews || 0,
        completion_rate: expert.completion_rate || 0,
        response_time_hours: expert.response_time_hours || 24,
        profile_completeness: expert.profile_completeness || 0
      }))

      setExperts(transformedData)
    } catch (error) {
      console.error('Error loading experts:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortExpertsWithRelevance = (experts: ExpertProfile[]) => {
    const sorted = [...experts]
    
    // Calculate relevance score for each expert based on current search
    const calculateRelevanceScore = (expert: ExpertProfile) => {
      let score = 0
      
      if (filters.keywords.trim()) {
        const keywords = filters.keywords.toLowerCase()
        if (expert.name.toLowerCase().includes(keywords)) score += 10
        if (expert.title.toLowerCase().includes(keywords)) score += 8
        if (expert.skills.some(skill => skill.toLowerCase().includes(keywords))) score += 6
        if (expert.hashtags.some(tag => tag.toLowerCase().includes(keywords))) score += 5
        if (expert.bio.toLowerCase().includes(keywords)) score += 3
      }
      
      // Boost for high-quality profiles
      if (expert.profile_completeness >= 90) score += 5
      if (expert.rating_average >= 4.5) score += 3
      if (expert.total_reviews >= 10) score += 2
      
      return score
    }
    
    sorted.sort((a, b) => {
      // First sort by relevance if there are keywords
      if (filters.keywords.trim()) {
        const relevanceA = calculateRelevanceScore(a)
        const relevanceB = calculateRelevanceScore(b)
        if (relevanceA !== relevanceB) {
          return relevanceB - relevanceA // Higher relevance first
        }
      }
      
      // Then by the selected sort criteria
      let compareValue = 0
      
      switch (filters.sortBy) {
        case 'rating':
          compareValue = a.rating_average - b.rating_average
          break
        case 'experience':
          compareValue = a.experience_years - b.experience_years
          break
        case 'hourlyRate':
          compareValue = (a.hourly_rate || 0) - (b.hourly_rate || 0)
          break
        case 'responseTime':
          compareValue = a.response_time_hours - b.response_time_hours
          break
        case 'completionRate':
          compareValue = a.completion_rate - b.completion_rate
          break
        case 'newest':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      
      return filters.sortOrder === 'desc' ? -compareValue : compareValue
    })
    
    return sorted
  }

  const filterExperts = () => {
    let filtered = experts

    // Keywords filter with fuzzy search (search in name, bio, title, skills, hashtags)
    if (filters.keywords.trim()) {
      const keywords = filters.keywords.toLowerCase().split(' ').filter(k => k.length > 1)
      filtered = filtered.filter(expert => {
        const searchText = `${expert.name} ${expert.bio} ${expert.title} ${expert.company} ${expert.skills.join(' ')} ${expert.hashtags.join(' ')}`.toLowerCase()
        return keywords.some(keyword => searchText.includes(keyword))
      })
    }

    // Location filter with partial matching
    if (filters.location.trim()) {
      const locationKeywords = filters.location.toLowerCase().split(' ').filter(l => l.length > 0)
      filtered = filtered.filter(expert =>
        locationKeywords.some(loc => expert.location.toLowerCase().includes(loc))
      )
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(expert => expert.rating_average >= filters.minRating)
    }

    // Hourly rate filter
    if (filters.maxHourlyRate) {
      filtered = filtered.filter(expert => 
        expert.hourly_rate && expert.hourly_rate <= filters.maxHourlyRate!
      )
    }
    
    if (filters.minHourlyRate) {
      filtered = filtered.filter(expert => 
        expert.hourly_rate && expert.hourly_rate >= filters.minHourlyRate!
      )
    }

    // Availability filter
    if (filters.availability !== 'all') {
      filtered = filtered.filter(expert => expert.availability_status === filters.availability)
    }

    // Experience years filter
    if (filters.experienceYears > 0) {
      filtered = filtered.filter(expert => expert.experience_years >= filters.experienceYears)
    }

    // Apply sorting with relevance boost for keyword matches
    filtered = sortExpertsWithRelevance(filtered)

    setFilteredExperts(filtered)
  }

  const calculateMatchScore = (expert: ExpertProfile) => {
    // Enhanced matching algorithm with relevance scoring
    let score = 0
    
    // Profile completeness (30%)
    score += (expert.profile_completeness / 100) * 30
    
    // Rating and reviews (25%)
    const ratingScore = (expert.rating_average / 5) * 20
    const reviewsBonus = Math.min(expert.total_reviews / 20, 1) * 5
    score += ratingScore + reviewsBonus
    
    // Experience (20%)
    score += Math.min(expert.experience_years / 15, 1) * 20
    
    // Availability and response time (15%)
    if (expert.availability_status === 'available') score += 10
    else if (expert.availability_status === 'busy') score += 6
    else score += 2
    
    if (expert.response_time_hours <= 12) score += 5
    else if (expert.response_time_hours <= 24) score += 3
    
    // Keyword relevance bonus (10%)
    if (filters.keywords.trim()) {
      const keywords = filters.keywords.toLowerCase()
      let relevanceBonus = 0
      
      if (expert.name.toLowerCase().includes(keywords)) relevanceBonus += 3
      if (expert.title.toLowerCase().includes(keywords)) relevanceBonus += 3
      if (expert.skills.some(skill => skill.toLowerCase().includes(keywords))) relevanceBonus += 2
      if (expert.hashtags.some(tag => tag.toLowerCase().includes(keywords))) relevanceBonus += 2
      
      score += relevanceBonus
    } else {
      // Default bonus for active profiles without keyword search
      score += 5
    }
    
    return Math.min(Math.round(score), 100)
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      case 'unavailable': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available': return '즉시 가능'
      case 'busy': return '협의 가능'
      case 'unavailable': return '불가능'
      default: return status
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleConnectionRequest = (expert: ExpertProfile) => {
    if (!organizationProfile) {
      alert('기관 프로필을 먼저 완성해주세요.')
      router.push('/profile/organization/complete')
      return
    }
    
    setSelectedExpert(expert)
    setShowConnectionForm(true)
  }

  const handleConnectionSuccess = () => {
    setShowConnectionForm(false)
    setSelectedExpert(null)
    alert('연결 요청이 성공적으로 전송되었습니다!')
  }

  const handleConnectionClose = () => {
    setShowConnectionForm(false)
    setSelectedExpert(null)
  }

  const logSearch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      await supabase
        .from('search_logs')
        .insert({
          user_id: user.id,
          search_query: filters.keywords,
          filters: {
            location: filters.location,
            minRating: filters.minRating,
            availability: filters.availability,
            experienceYears: filters.experienceYears,
            sortBy: filters.sortBy
          },
          results_count: filteredExperts.length
        })
    } catch (error) {
      // Silently fail - logging is not critical
      console.log('Failed to log search:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">전문가를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">전문가 검색</h1>
            <p className="text-gray-600 mt-2">
              프로젝트에 적합한 전문가를 찾아보세요
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredExperts.length}명</div>
            <div className="text-sm text-gray-500">검색된 전문가</div>
          </div>
        </div>
        
        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.availability === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('availability', filters.availability === 'available' ? 'all' : 'available')}
            className="text-xs"
          >
            즉시 가능
          </Button>
          <Button
            variant={filters.minRating >= 4.5 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('minRating', filters.minRating >= 4.5 ? 0 : 4.5)}
            className="text-xs"
          >
            ⭐ 4.5 이상
          </Button>
          <Button
            variant={filters.experienceYears >= 5 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('experienceYears', filters.experienceYears >= 5 ? 0 : 5)}
            className="text-xs"
          >
            5년+ 경력
          </Button>
          <Button
            variant={filters.sortBy === 'responseTime' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              handleFilterChange('sortBy', 'responseTime')
              handleFilterChange('sortOrder', 'asc')
            }}
            className="text-xs"
          >
            빠른 응답
          </Button>
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
                    placeholder="전문가 이름, 기술, 회사명으로 검색..."
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
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="location">지역</Label>
                    <Input
                      id="location"
                      placeholder="예: 서울, 부산, 대구"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="minRating">최소 평점</Label>
                    <select
                      id="minRating"
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={0}>전체</option>
                      <option value={3}>3점 이상</option>
                      <option value={4}>4점 이상</option>
                      <option value={4.5}>4.5점 이상</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="availability">활동 상태</Label>
                    <select
                      id="availability"
                      value={filters.availability}
                      onChange={(e) => handleFilterChange('availability', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">전체</option>
                      <option value="available">즉시 가능</option>
                      <option value="busy">협의 가능</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="experience">최소 경력</Label>
                    <select
                      id="experience"
                      value={filters.experienceYears}
                      onChange={(e) => handleFilterChange('experienceYears', parseInt(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={0}>전체</option>
                      <option value={1}>1년 이상</option>
                      <option value={3}>3년 이상</option>
                      <option value={5}>5년 이상</option>
                      <option value={10}>10년 이상</option>
                    </select>
                  </div>
                </div>
                
                {/* Hourly Rate Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minHourlyRate">최소 시급</Label>
                    <Input
                      id="minHourlyRate"
                      type="number"
                      placeholder="예: 50000"
                      value={filters.minHourlyRate || ''}
                      onChange={(e) => handleFilterChange('minHourlyRate', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxHourlyRate">최대 시급</Label>
                    <Input
                      id="maxHourlyRate"
                      type="number"
                      placeholder="예: 200000"
                      value={filters.maxHourlyRate || ''}
                      onChange={(e) => handleFilterChange('maxHourlyRate', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>
                
                {/* Sorting Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="sortBy">정렬 기준</Label>
                    <select
                      id="sortBy"
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="rating">평점순</option>
                      <option value="experience">경력순</option>
                      <option value="hourlyRate">시급순</option>
                      <option value="responseTime">응답 속도순</option>
                      <option value="completionRate">완료율순</option>
                      <option value="newest">최신 등록순</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="sortOrder">정렬 순서</Label>
                    <select
                      id="sortOrder"
                      value={filters.sortOrder}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="desc">높은순</option>
                      <option value="asc">낮은순</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilters({
                        keywords: '',
                        location: '',
                        minRating: 0,
                        maxHourlyRate: null,
                        minHourlyRate: null,
                        availability: 'all',
                        experienceYears: 0,
                        skills: [],
                        sortBy: 'rating',
                        sortOrder: 'desc'
                      })
                    }}
                  >
                    필터 초기화
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          총 <span className="font-semibold text-blue-600">{filteredExperts.length}명</span>의 전문가를 찾았습니다
          {filters.keywords && (
            <span className="ml-2">
              '<span className="font-medium">{filters.keywords}</span>' 검색 결과
            </span>
          )}
        </div>
        {filteredExperts.length > 0 && (
          <div className="text-sm text-gray-500">
            평균 응답시간: {Math.round(filteredExperts.reduce((sum, e) => sum + e.response_time_hours, 0) / filteredExperts.length)}시간
          </div>
        )}
      </div>

      {/* Expert List */}
      {filteredExperts.length === 0 ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
                <p className="text-sm mb-4">다른 키워드나 필터로 검색해보세요</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      keywords: '',
                      location: '',
                      minRating: 0,
                      maxHourlyRate: null,
                      minHourlyRate: null,
                      availability: 'all',
                      experienceYears: 0,
                      skills: [],
                      sortBy: 'rating',
                      sortOrder: 'desc'
                    })
                  }}
                >
                  필터 초기화
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Show top rated experts as suggestions */}
          {experts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">추천 전문가</h3>
              <div className="grid gap-4">
                {experts.slice(0, 3).map((expert) => {
                  const matchScore = calculateMatchScore(expert)
                  return (
                    <Card key={expert.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {expert.name.charAt(0)}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{expert.name}</CardTitle>
                                <p className="text-sm text-gray-600">{expert.title}</p>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/experts/${expert.id}`}>
                              프로필 보기
                            </Link>
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredExperts.map((expert) => {
            const matchScore = calculateMatchScore(expert)
            
            return (
              <Card key={expert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base sm:text-lg">
                          {expert.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">{expert.name}</CardTitle>
                          <p className="text-gray-600 text-sm sm:text-base">{expert.title}</p>
                          {expert.company && (
                            <p className="text-xs sm:text-sm text-gray-500">{expert.company}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <Badge className={getAvailabilityColor(expert.availability_status)}>
                          {getAvailabilityText(expert.availability_status)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                          <span className="font-medium text-sm sm:text-base">{expert.rating_average.toFixed(1)}</span>
                          <span className="text-gray-500 text-xs sm:text-sm">({expert.total_reviews}개 리뷰)</span>
                        </div>
                        {expert.hourly_rate && (
                          <div className="text-xs sm:text-sm font-medium text-gray-700">
                            ₩{expert.hourly_rate.toLocaleString()}/시간
                          </div>
                        )}
                        <Badge variant="outline" className={`text-xs ${
                          matchScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                          matchScore >= 60 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          매치율 {matchScore}%
                        </Badge>
                        {expert.profile_completeness >= 90 && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                            ✓ 인증됨
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 self-start">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/experts/${expert.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {userRole === 'organization' && (
                        <Button 
                          size="sm"
                          onClick={() => handleConnectionRequest(expert)}
                          className="text-xs sm:text-sm"
                        >
                          <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          연결 요청
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-2">
                    {expert.bio}
                  </CardDescription>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{expert.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                      {expert.experience_years}년 경력
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      평균 {expert.response_time_hours}시간 응답
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      완료율 {expert.completion_rate}%
                    </div>
                  </div>

                  {/* Skills */}
                  {expert.skills.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">주요 기술</h4>
                      <div className="flex flex-wrap gap-2">
                        {expert.skills.slice(0, 8).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {expert.skills.length > 8 && (
                          <Badge variant="outline" className="text-xs">
                            +{expert.skills.length - 8}개 더
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hashtags */}
                  {expert.hashtags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">전문 분야</h4>
                      <div className="flex flex-wrap gap-2">
                        {expert.hashtags.slice(0, 6).map((tag, index) => (
                          <span key={index} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                        {expert.hashtags.length > 6 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{expert.hashtags.length - 6}개 더
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Connection Request Form Modal */}
      {showConnectionForm && selectedExpert && organizationProfile && (
        <ConnectionRequestForm
          expertId={selectedExpert.id}
          expertName={selectedExpert.name}
          organizationId={organizationProfile.id}
          organizationName={organizationProfile.name}
          onClose={handleConnectionClose}
          onSuccess={handleConnectionSuccess}
        />
      )}
    </div>
  )
}
