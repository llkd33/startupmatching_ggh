'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/supabase'
import { CareerItem, EducationItem } from '@/types/supabase'
import CareerInput from './CareerInput'
import EducationInput from './EducationInput'
import HashtagManager from './HashtagManager'
import RegionSelector from './RegionSelector'

interface ExpertProfileFormProps {
  expertId: string
  initialData?: any
}

export default function ExpertProfileForm({ expertId, initialData }: ExpertProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [careerHistory, setCareerHistory] = useState<CareerItem[]>(
    initialData?.career_history || []
  )
  const [education, setEducation] = useState<EducationItem[]>(
    initialData?.education || []
  )
  const [hashtags, setHashtags] = useState<string[]>(
    initialData?.hashtags || []
  )
  const [serviceRegions, setServiceRegions] = useState<string[]>(
    initialData?.service_regions || []
  )
  const [isAvailable, setIsAvailable] = useState(
    initialData?.is_available ?? true
  )

  // Auto-generate hashtags when career or education changes
  useEffect(() => {
    const generateHashtags = async () => {
      if (careerHistory.length > 0 || education.length > 0) {
        setLoading(true)
        try {
          const { data } = await db.experts.updateHashtags(expertId)
          if (data) {
            setHashtags(data)
          }
        } catch (err) {
          console.error('Failed to generate hashtags:', err)
        } finally {
          setLoading(false)
        }
      }
    }

    const debounceTimer = setTimeout(generateHashtags, 1000)
    return () => clearTimeout(debounceTimer)
  }, [careerHistory, education, expertId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error } = await db.experts.updateProfile(expertId, {
        career_history: careerHistory,
        education: education,
        hashtags: hashtags,
        service_regions: serviceRegions,
        is_available: isAvailable,
      })

      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const isProfileComplete = () => {
    return (
      careerHistory.length > 0 &&
      education.length > 0 &&
      hashtags.length > 0 &&
      serviceRegions.length > 0
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              경력 사항
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              주요 경력을 입력해주세요. 회사명과 직책은 자동완성을 지원합니다.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <CareerInput
              careers={careerHistory}
              onChange={setCareerHistory}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              학력 사항
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              최종 학력을 입력해주세요.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <EducationInput
              educations={education}
              onChange={setEducation}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              전문 분야 태그
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              경력과 학력을 기반으로 자동 생성된 태그를 확인하고, 필요시 추가/삭제해주세요.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <HashtagManager
              hashtags={hashtags}
              onChange={setHashtags}
              loading={loading}
              maxTags={20}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              서비스 제공 지역
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              서비스 제공이 가능한 지역을 선택해주세요.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <RegionSelector
              selectedRegions={serviceRegions}
              onChange={setServiceRegions}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              가용성 설정
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              현재 새로운 프로젝트를 받을 수 있는지 설정해주세요.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <div className="flex items-center">
              <input
                id="is-available"
                name="is-available"
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is-available" className="ml-2 block text-sm text-gray-900">
                현재 프로젝트 수행 가능
              </label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!isProfileComplete() && (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            프로필을 완성하려면 모든 필수 항목을 입력해주세요.
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving || !isProfileComplete()}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중...' : '프로필 저장'}
        </button>
      </div>
    </form>
  )
}