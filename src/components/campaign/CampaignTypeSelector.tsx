'use client'

import { CampaignType } from '@/types/supabase'
import { AcademicCapIcon, CurrencyDollarIcon, BriefcaseIcon } from '@heroicons/react/24/outline'

interface CampaignTypeSelectorProps {
  value: CampaignType
  onChange: (type: CampaignType) => void
}

const CAMPAIGN_TYPES = [
  {
    value: 'lecture_mentoring' as CampaignType,
    label: '강의/멘토링',
    description: '전문가의 강의나 멘토링이 필요한 경우',
    icon: AcademicCapIcon,
  },
  {
    value: 'investor_matching' as CampaignType,
    label: '투자자 매칭',
    description: '투자 유치를 위한 투자자 연결',
    icon: CurrencyDollarIcon,
  },
  {
    value: 'service_outsourcing' as CampaignType,
    label: '용역/업무 대행',
    description: '특정 업무나 프로젝트 수행이 필요한 경우',
    icon: BriefcaseIcon,
  },
]

export default function CampaignTypeSelector({ value, onChange }: CampaignTypeSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">캠페인 유형</label>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CAMPAIGN_TYPES.map((type) => (
          <label
            key={type.value}
            className={`
              relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none
              ${value === type.value
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-white hover:bg-gray-50'
              }
            `}
          >
            <input
              type="radio"
              name="campaign-type"
              value={type.value}
              checked={value === type.value}
              onChange={() => onChange(type.value)}
              className="sr-only"
            />
            <div className="flex flex-1 flex-col">
              <div className="flex items-center">
                <type.icon
                  className={`h-5 w-5 ${
                    value === type.value ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`ml-2 block text-sm font-medium ${
                    value === type.value ? 'text-indigo-900' : 'text-gray-900'
                  }`}
                >
                  {type.label}
                </span>
              </div>
              <span
                className={`mt-1 text-sm ${
                  value === type.value ? 'text-indigo-700' : 'text-gray-500'
                }`}
              >
                {type.description}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}