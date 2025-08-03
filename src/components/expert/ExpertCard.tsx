'use client'

import { StarIcon } from '@heroicons/react/24/solid'
import { MapPinIcon, BriefcaseIcon } from '@heroicons/react/24/outline'
import { CareerItem, EducationItem } from '@/types/supabase'

interface ExpertCardProps {
  expert: {
    id: string
    user_id: string
    full_name: string
    email: string
    career_history: CareerItem[]
    education: EducationItem[]
    hashtags: string[]
    service_regions: string[]
    average_rating: number
    total_reviews: number
    is_available: boolean
  }
  onSelect?: (expertId: string) => void
  showSelectButton?: boolean
}

export default function ExpertCard({ expert, onSelect, showSelectButton }: ExpertCardProps) {
  const latestCareer = expert.career_history?.[0]
  const latestEducation = expert.education?.[0]

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {expert.full_name || '전문가'}
            </h3>
            {latestCareer && (
              <p className="text-sm text-gray-600 mt-1">
                {latestCareer.position} @ {latestCareer.company}
              </p>
            )}
          </div>
          {!expert.is_available && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              일정 불가
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center mt-3">
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((rating) => (
              <StarIcon
                key={rating}
                className={`h-4 w-4 ${
                  expert.average_rating > rating ? 'text-yellow-400' : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-600">
            {expert.average_rating.toFixed(1)} ({expert.total_reviews}개 리뷰)
          </span>
        </div>

        {/* Education */}
        {latestEducation && (
          <div className="flex items-center mt-3 text-sm text-gray-600">
            <BriefcaseIcon className="h-4 w-4 mr-1" />
            {latestEducation.school} {latestEducation.major}
          </div>
        )}

        {/* Location */}
        <div className="flex items-center mt-2 text-sm text-gray-600">
          <MapPinIcon className="h-4 w-4 mr-1" />
          {expert.service_regions.join(', ')}
        </div>

        {/* Hashtags */}
        <div className="mt-4 flex flex-wrap gap-1">
          {expert.hashtags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
          {expert.hashtags.length > 5 && (
            <span className="text-xs text-gray-500">
              +{expert.hashtags.length - 5}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            프로필 보기
          </button>
          {showSelectButton && onSelect && expert.is_available && (
            <button
              type="button"
              onClick={() => onSelect(expert.id)}
              className="flex-1 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              선택
            </button>
          )}
        </div>
      </div>
    </div>
  )
}