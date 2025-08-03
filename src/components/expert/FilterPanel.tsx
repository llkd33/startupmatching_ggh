'use client'

import { StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface FilterPanelProps {
  filters: {
    keywords: string[]
    location: string
    minRating: number
    available: boolean
  }
  categories: any[]
  onChange: (filters: any) => void
  onApply: () => void
}

const LOCATIONS = [
  '전국', '서울', '경기', '인천', '부산', '대구', '광주', '대전',
  '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
]

export default function FilterPanel({ filters, categories, onChange, onApply }: FilterPanelProps) {
  const handleKeywordToggle = (keyword: string) => {
    const updated = filters.keywords.includes(keyword)
      ? filters.keywords.filter(k => k !== keyword)
      : [...filters.keywords, keyword]
    onChange({ ...filters, keywords: updated })
  }

  const handleLocationChange = (location: string) => {
    onChange({ ...filters, location: location === filters.location ? '' : location })
  }

  const handleRatingChange = (rating: number) => {
    onChange({ ...filters, minRating: rating === filters.minRating ? 0 : rating })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">필터</h3>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">전문 분야</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.keywords.includes(category.name)}
                onChange={() => handleKeywordToggle(category.name)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">지역</h4>
        <select
          value={filters.location}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">모든 지역</option>
          {LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {/* Rating */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">최소 평점</h4>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleRatingChange(rating)}
              className={`flex items-center w-full px-3 py-2 text-sm rounded-md ${
                filters.minRating === rating
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  star <= rating ? (
                    <StarIconSolid key={star} className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <StarIcon key={star} className="h-4 w-4 text-gray-300" />
                  )
                ))}
              </div>
              <span className="ml-2">이상</span>
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.available}
            onChange={(e) => onChange({ ...filters, available: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">현재 가능한 전문가만</span>
        </label>
      </div>

      {/* Apply Button */}
      <div>
        <button
          type="button"
          onClick={onApply}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          필터 적용
        </button>
      </div>
    </div>
  )
}