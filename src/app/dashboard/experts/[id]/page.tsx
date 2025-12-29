'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Star, 
  MapPin, 
  Calendar,
  Award,
  Clock,
  TrendingUp,
  MessageCircle,
  Heart,
  Share,
  DollarSign,
  Briefcase,
  GraduationCap,
  User
} from 'lucide-react'
import { BookmarkButton } from '@/components/ui/bookmark-button'
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

interface Review {
  id: string
  rating: number
  comment: string
  reviewer_name: string
  created_at: string
  campaign_title?: string
}

export default function ExpertDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadExpertProfile()
    }
  }, [params.id])

  const loadExpertProfile = async () => {
    setLoading(true)
    
    try {
      // Check auth
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
      }

      // Load expert profile
      const { data: expertData, error: expertError } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (expertError) throw expertError
      setExpert(expertData)

      // Load reviews (mock data for now)
      setReviews([
        {
          id: '1',
          rating: 5,
          comment: '전문성이 뛰어나고 소통이 원활했습니다. 프로젝트를 성공적으로 완료해주셨어요.',
          reviewer_name: '김○○',
          created_at: '2024-01-15',
          campaign_title: 'React 개발 멘토링'
        },
        {
          id: '2',
          rating: 4,
          comment: '빠른 응답과 정확한 조언으로 많은 도움이 되었습니다.',
          reviewer_name: '이○○',
          created_at: '2024-01-10',
          campaign_title: 'UI/UX 컨설팅'
        }
      ])

    } catch (error) {
      console.error('Error loading expert profile:', error)
      router.push('/dashboard/experts')
    } finally {
      setLoading(false)
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">전문가 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!expert) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">전문가를 찾을 수 없습니다</h3>
            <p className="text-gray-600 mb-4">요청하신 전문가 정보가 존재하지 않습니다.</p>
            <Button asChild>
              <Link href="/dashboard/experts">
                전문가 목록으로 돌아가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/experts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            전문가 목록
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                  {expert.name.charAt(0)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold">{expert.name}</h1>
                      <p className="text-xl text-gray-600 mt-1">{expert.title}</p>
                      {expert.company && (
                        <p className="text-gray-500 mt-1">{expert.company}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Bookmark button for organizations */}
                      {userId && userRole === 'organization' && (
                        <BookmarkButton
                          userId={userId}
                          targetId={expert.id}
                          targetType="expert"
                          variant="ghost"
                        />
                      )}
                      <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <Badge className={getAvailabilityColor(expert.availability_status)}>
                      {getAvailabilityText(expert.availability_status)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{expert.rating_average.toFixed(1)}</span>
                      <span className="text-gray-500">({expert.total_reviews}개 리뷰)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {expert.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="h-4 w-4" />
                      {expert.experience_years}년 경력
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      평균 {expert.response_time_hours}시간 응답
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <TrendingUp className="h-4 w-4" />
                      완료율 {expert.completion_rate}%
                    </div>
                  </div>
                </div>
              </div>

              {expert.bio && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-2">소개</h3>
                  <p className="text-gray-700 leading-relaxed">{expert.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills & Expertise */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                전문 기술 및 분야
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {expert.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">주요 기술</h4>
                  <div className="flex flex-wrap gap-2">
                    {expert.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {expert.hashtags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">전문 분야</h4>
                  <div className="flex flex-wrap gap-2">
                    {expert.hashtags.map((tag, index) => (
                      <span key={index} className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Career History */}
          {expert.career_history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  경력
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expert.career_history.map((career: any, index: number) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-4">
                      <h4 className="font-medium">{career.position}</h4>
                      <p className="text-gray-600">{career.company}</p>
                      <p className="text-sm text-gray-500">
                        {career.start_date} - {career.end_date || '현재'}
                      </p>
                      {career.description && (
                        <p className="text-sm text-gray-700 mt-2">{career.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {expert.education.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  학력
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expert.education.map((edu: any, index: number) => (
                    <div key={index} className="border-l-2 border-green-200 pl-4">
                      <h4 className="font-medium">{edu.degree}</h4>
                      <p className="text-gray-600">{edu.school}</p>
                      <p className="text-sm text-gray-500">
                        {edu.start_date} - {edu.end_date}
                      </p>
                      {edu.field && (
                        <p className="text-sm text-gray-700 mt-1">전공: {edu.field}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                리뷰 ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{review.reviewer_name}</span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.campaign_title && (
                            <p className="text-sm text-gray-500">{review.campaign_title}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">아직 리뷰가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle>연락하기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {expert.hourly_rate && (
                <div className="flex items-center gap-2 text-lg font-medium">
                  <DollarSign className="h-5 w-5" />
                  시간당 ₩{expert.hourly_rate.toLocaleString()}
                </div>
              )}
              
              {userRole === 'organization' ? (
                <div className="space-y-3">
                  <Button className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    메시지 보내기
                  </Button>
                  <Button variant="outline" className="w-full">
                    제안서 요청
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    전문가에게 연락하려면<br />기관 계정으로 로그인해주세요
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>활동 통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">가입일</span>
                <span className="font-medium">{formatDate(expert.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">완료한 프로젝트</span>
                <span className="font-medium">{expert.total_reviews}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">평균 평점</span>
                <span className="font-medium">{expert.rating_average.toFixed(1)}/5.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">프로필 완성도</span>
                <span className="font-medium">{expert.profile_completeness}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Similar Experts */}
          <Card>
            <CardHeader>
              <CardTitle>비슷한 전문가</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 text-center py-4">
                유사한 전문가를 찾고 있습니다...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}