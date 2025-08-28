'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Calendar, DollarSign, MapPin, Briefcase, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import { useToast } from '@/components/ui/toast-provider'
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  }
  required_skills: string[]
  created_at: string
}

export default function CampaignSearchPage() {
  const { user } = useAuth()
  const { error: toastError } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('all')
  const [selectedBudget, setSelectedBudget] = useState('all')
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    filterCampaigns()
  }, [searchTerm, selectedIndustry, selectedBudget, campaigns])

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles (
            company_name,
            industry
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toastError('캠페인을 불러오는데 실패했습니다.', '오류')
    } finally {
      setLoading(false)
    }
  }

  const filterCampaigns = () => {
    let filtered = campaigns

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.required_skills?.some(skill => 
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
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

    setFilteredCampaigns(filtered)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">캠페인 찾기</h1>
        <p className="text-gray-600">나에게 맞는 프로젝트 기회를 찾아보세요</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search" className="sr-only">검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                type="text"
                placeholder="캠페인명, 설명, 기술 스택으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
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
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredCampaigns.length}개의 캠페인이 있습니다
          </p>
          <Button variant="outline" size="sm" onClick={() => {
            setSearchTerm('')
            setSelectedIndustry('all')
            setSelectedBudget('all')
          }}>
            <Filter className="h-4 w-4 mr-2" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Campaign List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {campaign.organization_profiles?.company_name}
                      <Badge variant="outline" className="ml-2">
                        {campaign.organization_profiles?.industry}
                      </Badge>
                    </p>
                  </div>
                  <Badge className={
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {campaign.status === 'active' ? '모집중' :
                     campaign.status === 'in_progress' ? '진행중' :
                     '완료'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {campaign.description}
                </p>
                
                {/* Skills */}
                {campaign.required_skills && campaign.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.required_skills.slice(0, 5).map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {campaign.required_skills.length > 5 && (
                      <Badge variant="outline">
                        +{campaign.required_skills.length - 5}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatBudget(campaign.budget)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    마감: {formatDate(campaign.deadline)}
                  </span>
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
            <p className="text-gray-600">다른 검색어나 필터를 시도해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}