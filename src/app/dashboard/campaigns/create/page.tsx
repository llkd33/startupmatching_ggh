'use client'

import { useAuth } from '@/components/auth/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import CampaignForm from '@/components/campaign/CampaignForm'
import { Button } from '@/components/ui/button'

type OrganizationProfileResponse = {
  profile?: {
    id: string
    is_profile_complete?: boolean | null
  }
}

export default function CreateCampaignPage() {
  const { user, loading, isOrganization } = useAuth()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileComplete, setProfileComplete] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user || !isOrganization) {
        console.log('Auth check failed - redirecting to login', { user, isOrganization })
        router.push('/auth/login')
      }
    }
  }, [user, loading, isOrganization, router])

  useEffect(() => {
    const loadOrganizationProfile = async () => {
      if (!user?.id || !isOrganization) {
        setLoadingProfile(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        const response = await fetch('/api/profile/organization', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (response.status === 401) {
          router.push('/auth/login')
          return
        }

        if (response.status === 403) {
          router.push('/dashboard')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to load organization profile')
        }

        const data = await response.json() as OrganizationProfileResponse
        setOrganizationId(data.profile?.id || null)
        setProfileComplete(data.profile?.is_profile_complete === true)
      } catch (err) {
        console.error('Error loading organization profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    if (user && isOrganization) {
      loadOrganizationProfile()
    }
  }, [user, isOrganization, router])

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
