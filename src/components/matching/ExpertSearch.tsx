'use client'

import { useState, useEffect } from 'react'
import { db, supabase } from '@/lib/supabase'

interface ExpertSearchProps {
  campaignId?: string
  onSelectExperts?: (expertIds: string[]) => void
}

export default function ExpertSearch({ campaignId, onSelectExperts }: ExpertSearchProps) {
  const [loading, setLoading] = useState(false)
  const [experts, setExperts] = useState<any[]>([])
  const [selectedExperts, setSelectedExperts] = useState<string[]>([])
  const [filters, setFilters] = useState({
    keywords: [] as string[],
    location: '',
    available: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  
  const regions = [
    '전국', '서울', '경기', '인천', '부산', '대구', '광주',
    '대전', '울산', '세종', '강원', '충북', '충남',
    '전북', '전남', '경북', '경남', '제주'
  ]

  const commonKeywords = [
    '창업컨설팅', '사업계획서', '투자유치', '마케팅', '영업',
    '재무/회계', '법률자문', '특허/지식재산', 'IT개발', '디자인',
    '브랜딩', '홍보/PR', '인사/조직', '해외진출', '정부지원사업'
  ]

  useEffect(() => {
    if (campaignId) {
      loadCampaignKeywords()
    }
  }, [campaignId])

  const loadCampaignKeywords = async () => {
    if (!campaignId) return
    
    try {
      const { data: campaign } = await db.campaigns.get(campaignId)
      if (campaign?.keywords) {
        setFilters({ ...filters, keywords: campaign.keywords })
        searchExperts(campaign.keywords)
      }
    } catch (error) {
      console.error('Error loading campaign:', error)
    }
  }

  const searchExperts = async (keywords?: string[]) => {
    setLoading(true)
    try {
      const searchKeywords = keywords || filters.keywords
      const { data, error } = await db.experts.search(
        searchKeywords,
        filters.location || undefined
      )
      
      if (error) {
        console.error('Search error:', error)
      } else {
        setExperts(data || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    searchExperts()
  }

  const toggleExpertSelection = (expertId: string) => {
    if (selectedExperts.includes(expertId)) {
      setSelectedExperts(selectedExperts.filter(id => id !== expertId))
    } else {
      setSelectedExperts([...selectedExperts, expertId])
    }
  }

  const handleSendNotifications = async () => {
    if (selectedExperts.length === 0) return
    
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          type: 'campaign_match',
          data: {
            campaignId,
            expertIds: selectedExperts,
          },
        }),
      })
      
      if (response.ok) {
        alert(`성공적으로 ${selectedExperts.length}명의 전문가에게 알림을 전송했습니다.`)
        setSelectedExperts([])
      } else {
        const error = await response.json()
        alert(`알림 전송 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Notification error:', error)
      alert('알림 전송 중 오류가 발생했습니다.')
    }
    
    if (onSelectExperts) {
      onSelectExperts(selectedExperts)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          전문가 검색
        </h3>
        
        {/* Keyword Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            키워드 선택
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {commonKeywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => {
                  if (filters.keywords.includes(keyword)) {
                    setFilters({
                      ...filters,
                      keywords: filters.keywords.filter(k => k !== keyword)
                    })
                  } else {
                    setFilters({
                      ...filters,
                      keywords: [...filters.keywords, keyword]
                    })
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.keywords.includes(keyword)
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                {keyword}
              </button>
            ))}
          </div>
          
          {/* Custom keyword input */}
          <input
            type="text"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="추가 키워드 입력 (Enter로 추가)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const value = searchQuery.trim()
                if (value && !filters.keywords.includes(value)) {
                  setFilters({
                    ...filters,
                    keywords: [...filters.keywords, value]
                  })
                  setSearchQuery('')
                }
              }
            }}
          />
        </div>

        {/* Location Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            지역
          </label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          >
            <option value="">전체 지역</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              검색 중...
            </>
          ) : (
            '전문가 검색'
          )}
        </button>
      </div>

      {/* Search Results */}
      {experts.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              검색 결과 ({experts.length}명)
            </h3>
            {selectedExperts.length > 0 && (
              <button
                type="button"
                onClick={handleSendNotifications}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                선택한 전문가에게 알림 보내기 ({selectedExperts.length}명)
              </button>
            )}
          </div>

          <div className="space-y-4">
            {experts.map((expert) => (
              <div
                key={expert.id}
                className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedExperts.includes(expert.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => toggleExpertSelection(expert.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-3"
                        checked={selectedExperts.includes(expert.id)}
                        onChange={() => {}}
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {expert.name || expert.full_name || '이름 미등록'}
                        </h4>
                        <p className="text-sm text-gray-500">{expert.email}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      {/* Skills/Keywords */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {expert.skills?.slice(0, 5).map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {expert.skills?.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{expert.skills.length - 5}
                          </span>
                        )}
                      </div>
                      
                      {/* Career Summary */}
                      {expert.career_history && Array.isArray(expert.career_history) && expert.career_history.length > 0 && (
                        <p className="text-xs text-gray-600">
                          경력: {expert.career_history[0].company} {expert.career_history[0].position}
                          {expert.career_history.length > 1 && ` 외 ${expert.career_history.length - 1}건`}
                        </p>
                      )}
                      
                      {/* Service Regions */}
                      <p className="text-xs text-gray-600 mt-1">
                        활동지역: {expert.service_regions?.join(', ') || '미등록'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end">
                    {/* Rating */}
                    {expert.rating > 0 && (
                      <div className="flex items-center mb-1">
                        <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm text-gray-600 ml-1">
                          {expert.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    
                    {/* Projects Count */}
                    {expert.total_projects > 0 && (
                      <p className="text-xs text-gray-500">
                        프로젝트 {expert.total_projects}건
                      </p>
                    )}
                    
                    {/* Availability */}
                    <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      expert.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {expert.is_available ? '활동 가능' : '활동 불가'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && experts.length === 0 && filters.keywords.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">다른 키워드로 검색해보세요.</p>
        </div>
      )}

      {/* Notification Strategy Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          📢 알림 전송 전략
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>1단계:</strong> 키워드가 정확히 일치하는 전문가에게 우선 알림</li>
          <li>• <strong>2단계:</strong> 응답률이 30% 미만시 유사 키워드 전문가로 확대</li>
          <li>• <strong>3단계:</strong> 48시간 후 카테고리 전체 전문가에게 공개</li>
          <li>• 현재는 수동으로 전문가를 선택하여 알림을 보낼 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
}