'use client'

import { useAuth } from '@/components/auth/AuthContext'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

const CampaignForm = dynamic(() => import('@/components/campaign/CampaignForm'), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-gray-500">
      캠페인 양식을 불러오는 중...
    </div>
  ),
})

type OrganizationProfileResponse = {
  profile?: {
    id: string
    is_profile_complete?: boolean | null
  }
}

export default function CreateCampaignPage() {
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileComplete, setProfileComplete] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.replace('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    let cancelled = false

    const loadOrganizationProfile = async () => {
      if (loading) {
        return
      }

      if (!user?.id) {
        if (!cancelled) {
          setLoadingProfile(false)
        }
        return
      }

      if (!cancelled) {
        setLoadError(null)
        setLoadingProfile(true)
      }

      try {
        const accessToken = session?.access_token || (
          await supabase.auth.getSession()
        ).data.session?.access_token

        if (!accessToken) {
          router.replace('/auth/login')
          return
        }

        const response = await fetch('/api/profile/organization', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.status === 401) {
          router.replace('/auth/login')
          return
        }

        if (response.status === 403) {
          router.replace('/dashboard')
          return
        }

        if (!response.ok) {
          throw new Error('기관 프로필을 불러오지 못했습니다.')
        }

        const data = await response.json() as OrganizationProfileResponse
        if (!cancelled) {
          setOrganizationId(data.profile?.id || null)
          setProfileComplete(data.profile?.is_profile_complete === true)
        }
      } catch (err) {
        console.error('Error loading organization profile:', err)
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : '기관 프로필을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false)
        }
      }
    }

    loadOrganizationProfile()

    return () => {
      cancelled = true
    }
  }, [user?.id, session?.access_token, loading, router])

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loadError || !organizationId) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">
              캠페인 생성 준비 중 오류가 발생했습니다
            </h3>
            <p className="text-red-800 mb-4">
              {loadError || '기관 프로필을 찾을 수 없습니다.'}
            </p>
            <Button onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">캠페인 생성</h1>
          <p className="mt-2 text-gray-600">
            새로운 전문가 매칭 캠페인을 생성해보세요.
          </p>
        </div>

        {!profileComplete && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-medium text-yellow-900">
                  기관 프로필을 완성하면 매칭 품질이 좋아집니다
                </h3>
                <p className="text-sm text-yellow-800 mt-1">
                  캠페인은 지금 바로 만들 수 있고, 프로필은 나중에 완성해도 됩니다.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/profile/organization/complete?redirect=/dashboard/campaigns/create')}
              >
                프로필 완성하기
              </Button>
            </div>
          </div>
        )}

        <CampaignForm organizationId={organizationId} />
      </div>
    </div>
  )
}
