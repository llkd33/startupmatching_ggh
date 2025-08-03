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
  availability: string
  experienceYears: number
  skills: string[]
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
    availability: 'all',
    experienceYears: 0,
    skills: []
  })

  useEffect(() => {
    checkAuthAndLoadExperts()
  }, [])

  useEffect(() => {
    filterExperts()
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
      const { data, error } = await supabase
        .from('expert_profiles')
        .select(`
          *,
          users!inner(email)
        `)
        .eq('profile_completeness', 100) // Only show completed profiles
        .order('rating_average', { ascending: false })

      if (error) throw error

      setExperts(data || [])
    } catch (error) {
      console.error('Error loading experts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterExperts = () => {
    let filtered = experts

    // Keywords filter (search in name, bio, title, skills, hashtags)
    if (filters.keywords.trim()) {
      const keywords = filters.keywords.toLowerCase()
      filtered = filtered.filter(expert =>
        expert.name.toLowerCase().includes(keywords) ||
        expert.bio.toLowerCase().includes(keywords) ||
        expert.title.toLowerCase().includes(keywords) ||
        expert.company.toLowerCase().includes(keywords) ||
        expert.skills.some(skill => skill.toLowerCase().includes(keywords)) ||
        expert.hashtags.some(tag => tag.toLowerCase().includes(keywords))
      )
    }

    // Location filter
    if (filters.location.trim()) {
      filtered = filtered.filter(expert =>
        expert.location.toLowerCase().includes(filters.location.toLowerCase())
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

    // Availability filter
    if (filters.availability !== 'all') {
      filtered = filtered.filter(expert => expert.availability_status === filters.availability)
    }

    // Experience years filter
    if (filters.experienceYears > 0) {
      filtered = filtered.filter(expert => expert.experience_years >= filters.experienceYears)
    }

    setFilteredExperts(filtered)
  }

  const calculateMatchScore = (expert: ExpertProfile) => {
    // Simple matching algorithm based on profile completeness, rating, and activity
    let score = 0
    
    // Profile completeness (40%)
    score += (expert.profile_completeness / 100) * 40
    
    // Rating (30%)
    score += (expert.rating_average / 5) * 30
    
    // Experience (20%)
    score += Math.min(expert.experience_years / 10, 1) * 20
    
    // Availability (10%)
    if (expert.availability_status === 'available') score += 10
    else if (expert.availability_status === 'busy') score += 5
    
    return Math.round(score)
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">전문가 검색</h1>
          <p className="text-gray-600 mt-2">
            프로젝트에 적합한 전문가를 찾아보세요
          </p>
        </div>
        <div className="text-sm text-gray-500">
          총 {filteredExperts.length}명의 전문가
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expert List */}
      {filteredExperts.length === 0 ? (
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
          {filteredExperts.map((expert) => {
            const matchScore = calculateMatchScore(expert)
            
            return (
              <Card key={expert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {expert.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{expert.name}</CardTitle>
                          <p className="text-gray-600">{expert.title}</p>
                          {expert.company && (
                            <p className="text-sm text-gray-500">{expert.company}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <Badge className={getAvailabilityColor(expert.availability_status)}>
                          {getAvailabilityText(expert.availability_status)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{expert.rating_average.toFixed(1)}</span>
                          <span className="text-gray-500">({expert.total_reviews}개 리뷰)</span>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          매치율 {matchScore}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/experts/${expert.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {userRole === 'organization' && (
                        <Button 
                          size="sm"
                          onClick={() => handleConnectionRequest(expert)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {expert.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award className="h-4 w-4" />
                      {expert.experience_years}년 경력
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      평균 {expert.response_time_hours}시간 응답
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="h-4 w-4" />
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