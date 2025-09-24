'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Star,
  Clock,
  TrendingUp,
  DollarSign,
  Award,
  MessageCircle,
  Eye,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Crown
} from 'lucide-react'
import Link from 'next/link'
import { getPersonalizedRecommendations } from '@/lib/matching-algorithm'

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
}

interface ExpertRecommendationsProps {
  organizationId: string
  onExpertSelect?: (expert: ExpertProfile) => void
}

interface RecommendationSection {
  title: string
  description: string
  icon: React.ReactNode
  badge?: string
  experts: ExpertProfile[]
}

export default function ExpertRecommendations({ 
  organizationId, 
  onExpertSelect 
}: ExpertRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<{
    trending: ExpertProfile[]
    quickResponders: ExpertProfile[]
    budgetFriendly: ExpertProfile[]
    topRated: ExpertProfile[]
  }>({
    trending: [],
    quickResponders: [],
    budgetFriendly: [],
    topRated: []
  })
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('trending')

  useEffect(() => {
    loadRecommendations()
  }, [organizationId])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const data = await getPersonalizedRecommendations(organizationId)
      setRecommendations(data)
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setLoading(false)
    }
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

  const sections: Record<string, RecommendationSection> = {
    trending: {
      title: '떠오르는 신규 전문가',
      description: '최근 합류한 실력있는 전문가들을 만나보세요',
      icon: <TrendingUp className="h-5 w-5" />,
      badge: 'NEW',
      experts: recommendations.trending
    },
    quick: {
      title: '빠른 응답 전문가',
      description: '12시간 이내 빠른 응답을 보장하는 전문가들',
      icon: <Zap className="h-5 w-5" />,
      badge: 'FAST',
      experts: recommendations.quickResponders
    },
    budget: {
      title: '합리적 가격 전문가',
      description: '품질 대비 합리적인 비용의 전문가들',
      icon: <DollarSign className="h-5 w-5" />,
      badge: 'VALUE',
      experts: recommendations.budgetFriendly
    },
    toprated: {
      title: '최고 평점 전문가',
      description: '검증된 실력의 최고 평점 전문가들',
      icon: <Crown className="h-5 w-5" />,
      badge: 'PREMIUM',
      experts: recommendations.topRated
    }
  }

  const renderExpertCard = (expert: ExpertProfile, showBadge?: string) => (
    <Card key={expert.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {expert.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{expert.name}</CardTitle>
                {showBadge && (
                  <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                    {showBadge}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 text-sm">{expert.title}</p>
              {expert.company && (
                <p className="text-xs text-gray-500">{expert.company}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge className={getAvailabilityColor(expert.availability_status)}>
            {getAvailabilityText(expert.availability_status)}
          </Badge>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500 fill-current" />
            <span className="font-medium text-sm">{expert.rating_average.toFixed(1)}</span>
            <span className="text-gray-500 text-xs">({expert.total_reviews})</span>
          </div>
          {expert.hourly_rate && (
            <div className="text-xs font-medium text-gray-700">
              ₩{expert.hourly_rate.toLocaleString()}/시간
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <CardDescription className="mb-4 line-clamp-2 text-sm">
          {expert.bio}
        </CardDescription>

        <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {expert.experience_years}년 경력
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {expert.response_time_hours}시간 응답
          </div>
        </div>

        {/* Skills */}
        {expert.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {expert.skills.slice(0, 4).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {expert.skills.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{expert.skills.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/experts/${expert.id}`}>
              <Eye className="h-3 w-3 mr-1" />
              프로필
            </Link>
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onExpertSelect?.(expert)}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            연결 요청
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderSkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">맞춤 전문가 추천</h2>
          <p className="text-gray-600">당신의 프로젝트에 적합한 전문가를 찾고 있습니다...</p>
        </div>

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trending">떠오르는</TabsTrigger>
            <TabsTrigger value="quick">빠른 응답</TabsTrigger>
            <TabsTrigger value="budget">합리적</TabsTrigger>
            <TabsTrigger value="toprated">최고 평점</TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>{renderSkeletonCard()}</div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const hasRecommendations = Object.values(recommendations).some(list => list.length > 0)

  if (!hasRecommendations) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">맞춤 추천을 준비 중입니다</h3>
          <p className="text-sm text-gray-600 mb-4">
            캠페인을 생성하시면 더 정확한 전문가 추천을 받으실 수 있습니다
          </p>
          <Button asChild>
            <Link href="/dashboard/campaigns/create">
              첫 캠페인 만들기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Target className="h-6 w-6 text-blue-600" />
          맞춤 전문가 추천
        </h2>
        <p className="text-gray-600">
          당신의 프로젝트 히스토리를 분석하여 최적의 전문가를 추천드립니다
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">떠오르는</span>
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">빠른 응답</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">합리적</span>
          </TabsTrigger>
          <TabsTrigger value="toprated" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">최고 평점</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(sections).map(([key, section]) => (
          <TabsContent key={key} value={key === 'toprated' ? 'toprated' : key} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {section.icon}
                <div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>
              
              {section.experts.length > 0 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/experts">
                    전체 보기
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>

            {section.experts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500">
                    <h4 className="font-medium mb-2">추천 전문가가 없습니다</h4>
                    <p className="text-sm">다른 카테고리를 확인해보세요</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.experts.map((expert) => 
                  renderExpertCard(expert, section.badge)
                )}
              </div>
            )}

            {section.experts.length > 6 && (
              <div className="text-center">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/experts?tab=${key}`}>
                    더 많은 {section.title} 보기
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {recommendations.trending.length + recommendations.quickResponders.length + 
                 recommendations.budgetFriendly.length + recommendations.topRated.length}
              </div>
              <div className="text-sm text-gray-600">추천 전문가</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((recommendations.quickResponders.length / Math.max(1, recommendations.quickResponders.length + recommendations.budgetFriendly.length + recommendations.topRated.length + recommendations.trending.length)) * 100) || 0}%
              </div>
              <div className="text-sm text-gray-600">즉시 가능</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {recommendations.quickResponders.length > 0 
                  ? Math.round(recommendations.quickResponders.reduce((sum, e) => sum + e.response_time_hours, 0) / recommendations.quickResponders.length)
                  : 0}시간
              </div>
              <div className="text-sm text-gray-600">평균 응답</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {recommendations.topRated.length > 0 
                  ? recommendations.topRated.reduce((sum, e) => sum + e.rating_average, 0) / recommendations.topRated.length 
                  : 0}
              </div>
              <div className="text-sm text-gray-600">평균 평점</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}