'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Hash, 
  Clock,
  DollarSign,
  ExternalLink,
  Star
} from 'lucide-react'

interface ExpertProfile {
  id: string
  name: string
  bio: string
  skills: string[]
  service_regions: string[]
  hourly_rate: number | null
  portfolio_url: string
  career_history: any[]
  education: any[]
  rating: number
  total_projects: number
  is_available: boolean
}

export default function ExpertProfilePage() {
  const params = useParams()
  const expertId = params.id as string
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ExpertProfile | null>(null)
  const [hashtags, setHashtags] = useState<string[]>([])

  useEffect(() => {
    if (expertId) {
      loadProfile()
    }
  }, [expertId])

  const loadProfile = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('id', expertId)
        .single()

      if (error) throw error

      if (data) {
        setProfile(data)
        generateHashtags(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateHashtags = (profileData: ExpertProfile) => {
    const tags = new Set<string>()
    
    // Add skills as hashtags
    profileData.skills?.forEach(skill => {
      tags.add(`#${skill.replace(/\s+/g, '')}`)
    })
    
    // Add career-based tags
    profileData.career_history?.forEach((career: any) => {
      const position = career.position?.toLowerCase() || ''
      if (position.includes('개발')) tags.add('#개발자')
      if (position.includes('디자인')) tags.add('#디자이너')
      if (position.includes('마케팅')) tags.add('#마케터')
      if (position.includes('기획')) tags.add('#기획자')
    })
    
    setHashtags(Array.from(tags))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>프로필을 불러오는 중...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>프로필을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {profile.is_available && (
                      <Badge variant="outline" className="text-green-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    )}
                    {profile.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{profile.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {profile.total_projects > 0 && (
                      <span>{profile.total_projects} 프로젝트 완료</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {profile.hourly_rate && (
                  <div className="text-lg font-semibold">
                    ₩{profile.hourly_rate.toLocaleString()}/시간
                  </div>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                  >
                    포트폴리오
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            
            {profile.bio && (
              <p className="mt-4 text-gray-700">{profile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                전문 분야
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hashtags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {profile.skills?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">보유 스킬</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Regions */}
        {profile.service_regions?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                서비스 가능 지역
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.service_regions.map(region => (
                  <Badge key={region} variant="outline">
                    {region}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career History */}
        {profile.career_history?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                경력 사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.career_history.map((career: any, index: number) => (
                  <div key={index} className="border-l-2 border-gray-200 pl-4">
                    <div className="font-semibold">{career.position}</div>
                    <div className="text-gray-600">{career.company}</div>
                    <div className="text-sm text-gray-500">
                      {career.startDate} - {career.current ? '현재' : career.endDate}
                    </div>
                    {career.description && (
                      <p className="mt-2 text-sm text-gray-700">{career.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {profile.education?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                학력 사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.education.map((edu: any, index: number) => (
                  <div key={index}>
                    <div className="font-semibold">{edu.school}</div>
                    <div className="text-gray-600">
                      {edu.degree} - {edu.field}
                    </div>
                    <div className="text-sm text-gray-500">
                      {edu.graduationDate}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Button */}
        <div className="flex justify-center">
          <Button size="lg" className="px-8">
            제안서 보내기
          </Button>
        </div>
      </div>
    </div>
  )
}