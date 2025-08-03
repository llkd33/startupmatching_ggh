'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/supabase'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'
import ExpertCard from './ExpertCard'
import FilterPanel from './FilterPanel'

interface ExpertSearchProps {
  campaignId?: string
  onSelectExpert?: (expertId: string) => void
}

export default function ExpertSearch({ campaignId, onSelectExpert }: ExpertSearchProps) {
  const [experts, setExperts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    keywords: [] as string[],
    location: '',
    minRating: 0,
    available: true,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    loadCategories()
    searchExperts()
  }, [])

  const loadCategories = async () => {
    const { data } = await db.categories.list()
    setCategories(data || [])
  }

  const searchExperts = async () => {
    setLoading(true)
    try {
      const { data, error } = await db.experts.search(
        filters.keywords,
        filters.location
      )
      
      if (error) throw error

      // Apply additional filters
      let filtered = data || []
      
      if (filters.minRating > 0) {
        filtered = filtered.filter(e => e.average_rating >= filters.minRating)
      }
      
      if (filters.available) {
        filtered = filtered.filter(e => e.is_available)
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(e => 
          e.full_name?.toLowerCase().includes(query) ||
          e.hashtags.some((tag: string) => tag.toLowerCase().includes(query))
        )
      }

      setExperts(filtered)
    } catch (err) {
      console.error('Failed to search experts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchExperts()
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const applyFilters = () => {
    searchExperts()
    setShowFilters(false)
  }

  return (
    <div className="flex h-full">
      {/* Filter Panel */}
      <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-80 bg-white p-6 border-r`}>
        <FilterPanel
          filters={filters}
          categories={categories}
          onChange={handleFilterChange}
          onApply={applyFilters}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Search Bar */}
        <div className="bg-white p-4 border-b">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="전문가 이름 또는 키워드로 검색"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              {experts.length}명의 전문가를 찾았습니다
            </p>
            <select className="text-sm border-gray-300 rounded-md">
              <option>관련도순</option>
              <option>평점순</option>
              <option>리뷰순</option>
              <option>최신순</option>
            </select>
          </div>
        </div>

        {/* Expert List */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                검색 중...
              </div>
            </div>
          ) : experts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-400 mt-2">다른 키워드로 검색해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {experts.map((expert) => (
                <ExpertCard
                  key={expert.id}
                  expert={expert}
                  onSelect={onSelectExpert}
                  showSelectButton={!!campaignId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}