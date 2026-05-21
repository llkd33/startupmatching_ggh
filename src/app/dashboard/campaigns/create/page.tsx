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
  const { user, session, role, loading } = useAuth()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileComplete, setProfileComplete] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const isOrganization = role === 'organization'

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.replace('/auth/login')
      return
    }

    if (role === null) {
      return
    }

    if (!isOrganization) {
      router.replace('/dashboard')
    }
  }, [user, loading, role, isOrganization, router])

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

      if (role === null) {
        if (!cancelled) {
          setLoadingProfile(true)
        }
        return
      }

      if (!isOrganization) {
        if (!cancelled) {
          setLoadingProfile(false)
        }
        return
      }

      if (!cancelled) {
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
          throw new Error('Failed to load organization profile')
        }

        const data = await response.json() as OrganizationProfileResponse
        if (!cancelled) {
          setOrganizationId(data.profile?.id || null)
          setProfileComplete(data.profile?.is_profile_complete === true)
        }
      } catch (err) {
        console.error('Error loading organization profile:', err)
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
  }, [user?.id, session?.access_token, loading, role, isOrganization, router])

  if (loading || loadingProfile || (user && role === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user || !isOrganization) {
    return null
  }

  if (!organizationId || !profileComplete) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-yellow-900 mb-2">
              프로필 완성 필요
            </h3>
            <p className="text-yellow-800 mb-4">
              캠페인을 생성하려면 먼저 기관 프로필을 완성해주세요.
            </p>
            <Button onClick={() => router.push('/profile/organization/complete?redirect=/dashboard/campaigns/create')}>
              프로필 완성하기 →
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

        <CampaignForm organizationId={organizationId} />
      </div>
    </div>
  )
}
