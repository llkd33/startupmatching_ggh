'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter,
  Star,
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Eye,
  MessageCircle,
  X,
  ChevronDown,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { debounce } from 'lodash'

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
  skills: string[]
  minRating: number
  maxHourlyRate: number | null
  minHourlyRate: number | null
  availability: string
  experienceYears: number
  sortBy: 'relevance' | 'rating' | 'experience' | 'hourlyRate' | 'responseTime' | 'newest'
  sortOrder: 'asc' | 'desc'
}

interface EnhancedExpertSearchProps {
  onExpertSelect?: (expert: ExpertProfile) => void
  showSelectionMode?: boolean
  organizationId?: string
}

const POPULAR_SKILLS = [
  'React', 'JavaScript', 'TypeScript', 'Python', 'Java', 'Node.js',
  'UI/UX 디자인', '마케팅', '데이터 분석', 'AI/ML', '블록체인', '모바일 앱'
]

const LOCATIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
]

export default function EnhancedExpertSearch({ 
  onExpertSelect, 
  showSelectionMode = false,
  organizationId 
}: EnhancedExpertSearchProps) {
  const [experts, setExperts] = useState<ExpertProfile[]>([])
  const [filteredExperts, setFilteredExperts] = useState<ExpertProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  const [filters, setFilters] = useState<SearchFilters>({
    keywords: '',
    location: '',
    skills: [],
    minRating: 0,
    maxHourlyRate: null,
    minHourlyRate: null,
    availability: 'all',
    experienceYears: 0,
    sortBy: 'relevance',
    sortOrder: 'desc'
  })

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchFilters: SearchFilters) => {
      setSearchLoading(true)
      await performSearch(searchFilters)
      setSearchLoading(false)
    }, 300),
    []
  )

  const performSearch = async (searchFilters: SearchFilters) => {
    try {
      let query = supabase
        .from('expert_search_view')
        .select('*')
        .gte('profile_completeness', 30)

      // Apply server-side filters for better performance
      if (searchFilters.location) {
        query = query.ilike('location', `%${searchFilters.location}%`)
      }
      
      if (searchFilters.minRating > 0) {
        query = query.gte('rating_average', searchFilters.minRating)
      }

      if (searchFilters.availability !== 'all') {
        query = query.eq('availability_status', searchFilters.availability)
      }

      if (searchFilters.experienceYears > 0) {
        query = query.gte('experience_years', searchFilters.experienceYears)
      }

      if (searchFilters.minHourlyRate) {
        query = query.gte('hourly_rate', searchFilters.minHourlyRate)
      }

      if (searchFilters.maxHourlyRate) {
        query = query.lte('hourly_rate', searchFilters.maxHourlyRate)
      }

      // Basic server-side sorting
      const { data, error } = await query
        .order('rating_average', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(200) // Reasonable limit for performance

      if (error) throw error

      const transformedData = (data || []).map(expert => ({
        ...expert,
        skills: expert.skills || [],
        hashtags: expert.hashtags || [],
        experience_years: expert.experience_years || 0,
        rating_average: expert.rating_average || 0,
        total_reviews: expert.total_reviews || 0,
        completion_rate: expert.completion_rate || 0,
        response_time_hours: expert.response_time_hours || 24,
        profile_completeness: expert.profile_completeness || 0
      }))

      setExperts(transformedData)
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  // Client-side filtering with advanced matching
  const applyClientSideFilters = useMemo(() => {
    let filtered = experts

    // Keyword search with relevance scoring
    if (filters.keywords.trim()) {
      const keywords = filters.keywords.toLowerCase().split(' ').filter(k => k.length > 0)
      
      filtered = filtered.map(expert => {
        let relevanceScore = 0
        const searchText = `${expert.name} ${expert.bio} ${expert.title} ${expert.company} ${expert.skills.join(' ')} ${expert.hashtags.join(' ')}`.toLowerCase()

        keywords.forEach(keyword => {
          if (expert.name.toLowerCase().includes(keyword)) relevanceScore += 10
          if (expert.title.toLowerCase().includes(keyword)) relevanceScore += 8
          if (expert.skills.some(skill => skill.toLowerCase().includes(keyword))) relevanceScore += 6
          if (expert.hashtags.some(tag => tag.toLowerCase().includes(keyword))) relevanceScore += 5
          if (searchText.includes(keyword)) relevanceScore += 2
        })

        return { ...expert, relevanceScore }
      }).filter(expert => expert.relevanceScore > 0)
    } else {
      filtered = filtered.map(expert => ({ ...expert, relevanceScore: 5 }))
    }

    // Skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter(expert =>
        filters.skills.some(skill =>
          expert.skills.some(expertSkill =>
            expertSkill.toLowerCase().includes(skill.toLowerCase())
          ) ||
          expert.hashtags.some(tag =>
            tag.toLowerCase().includes(skill.toLowerCase())
          )
        )
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (filters.sortBy === 'relevance') {
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore
        }
      }

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
        case 'newest':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        default:
          // Default to rating for relevance ties
          compareValue = a.rating_average - b.rating_average
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue
    })

    return filtered
  }, [experts, filters])

  useEffect(() => {
    setFilteredExperts(applyClientSideFilters)
  }, [applyClientSideFilters])

  useEffect(() => {
    if (filters.keywords || filters.location || filters.minRating > 0 || 
        filters.skills.length > 0 || filters.availability !== 'all' ||
        filters.experienceYears > 0 || filters.minHourlyRate || filters.maxHourlyRate) {
      debouncedSearch(filters)
    } else {
      performSearch(filters) // Initial load
    }
  }, [filters, debouncedSearch])

  useEffect(() => {
    // Count active filters
    let count = 0
    if (filters.keywords) count++
    if (filters.location) count++
    if (filters.skills.length > 0) count++
    if (filters.minRating > 0) count++
    if (filters.availability !== 'all') count++
    if (filters.experienceYears > 0) count++
    if (filters.minHourlyRate || filters.maxHourlyRate) count++
    
    setActiveFiltersCount(count)
  }, [filters])

  const handleFilterChange = <K extends keyof SearchFilters>(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const addSkillFilter = (skill: string) => {
    if (!filters.skills.includes(skill)) {
      setFilters(prev => ({ ...prev, skills: [...prev.skills, skill] }))
    }
  }

  const removeSkillFilter = (skill: string) => {
    setFilters(prev => ({ 
      ...prev, 
      skills: prev.skills.filter(s => s !== skill) 
    }))
  }

  const clearFilters = () => {
    setFilters({
      keywords: '',
      location: '',
      skills: [],
      minRating: 0,
      maxHourlyRate: null,
      minHourlyRate: null,
      availability: 'all',
      experienceYears: 0,
      sortBy: 'relevance',
      sortOrder: 'desc'
    })
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      case 'busy': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unavailable': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Search Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Main Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="전문가 이름, 기술, 분야로 검색..."
                  value={filters.keywords}
                  onChange={(e) => handleFilterChange('keywords', e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                필터
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
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
                ⭐ 4.5+
              </Button>
              <Button
                variant={filters.experienceYears >= 5 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('experienceYears', filters.experienceYears >= 5 ? 0 : 5)}
                className="text-xs"
              >
                5년+ 경력
              </Button>
              
              {/* Popular Skills */}
              {POPULAR_SKILLS.slice(0, 4).map((skill) => (
                <Button
                  key={skill}
                  variant={filters.skills.includes(skill) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (filters.skills.includes(skill)) {
                      removeSkillFilter(skill)
                    } else {
                      addSkillFilter(skill)
                    }
                  }}
                  className="text-xs"
                >
                  {skill}
                </Button>
              ))}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>지역</Label>
                    <Select 
                      value={filters.location} 
                      onValueChange={(value) => handleFilterChange('location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="모든 지역" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">모든 지역</SelectItem>
                        {LOCATIONS.map(location => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>정렬 기준</Label>
                    <Select 
                      value={filters.sortBy} 
                      onValueChange={(value: any) => handleFilterChange('sortBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">관련도순</SelectItem>
                        <SelectItem value="rating">평점순</SelectItem>
                        <SelectItem value="experience">경력순</SelectItem>
                        <SelectItem value="responseTime">응답속도순</SelectItem>
                        <SelectItem value="newest">최신순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>최소 경력</Label>
                    <Select 
                      value={filters.experienceYears.toString()} 
                      onValueChange={(value) => handleFilterChange('experienceYears', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">전체</SelectItem>
                        <SelectItem value="1">1년+</SelectItem>
                        <SelectItem value="3">3년+</SelectItem>
                        <SelectItem value="5">5년+</SelectItem>
                        <SelectItem value="10">10년+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selected Skills */}
                {filters.skills.length > 0 && (
                  <div>
                    <Label>선택된 기술</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filters.skills.map(skill => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {skill}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeSkillFilter(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                    >
                      모든 필터 초기화
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          총 <span className="font-semibold text-blue-600">{filteredExperts.length}명</span>의 전문가
          {filters.keywords && (
            <span className="ml-2">
              '<span className="font-medium">{filters.keywords}</span>' 검색 결과
            </span>
          )}
        </div>
        
        {filteredExperts.length > 0 && (
          <div className="text-sm text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              평균 {Math.round(filteredExperts.reduce((sum, e) => sum + e.response_time_hours, 0) / filteredExperts.length)}시간 응답
            </span>
          </div>
        )}
      </div>

      {/* Expert Results */}
      <div className="space-y-4">
        {filteredExperts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
                <p className="text-sm mb-4">다른 키워드나 필터로 검색해보세요</p>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    필터 초기화
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredExperts.map((expert) => (
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
                      {expert.profile_completeness >= 90 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
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
                    {showSelectionMode && onExpertSelect && (
                      <Button 
                        size="sm"
                        onClick={() => onExpertSelect(expert)}
                        className="text-xs sm:text-sm"
                      >
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        선택
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
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className={`text-xs cursor-pointer hover:bg-blue-100 ${
                            filters.skills.includes(skill) ? 'bg-blue-100 text-blue-700' : ''
                          }`}
                          onClick={() => addSkillFilter(skill)}
                        >
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
                        <span 
                          key={index} 
                          className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded cursor-pointer hover:bg-blue-100"
                          onClick={() => handleFilterChange('keywords', tag)}
                        >
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
          ))
        )}
      </div>
    </div>
  )
}