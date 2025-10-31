'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import CampaignForm from '@/components/campaign/CampaignForm'
import { Button } from '@/components/ui/button'

export default function CreateCampaignPage() {
  const { user, loading, isOrganization } = useAuth()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (!loading) {
      setAuthChecked(true)
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
        const { data, error } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Failed to load organization profile:', error)
        }

        setOrganizationId(data?.id || null)
      } catch (err) {
        console.error('Error loading organization profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    if (user && isOrganization) {
      loadOrganizationProfile()
    }
  }, [user, isOrganization])

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

  if (!organizationId) {
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
            <Button onClick={() => router.push('/dashboard/organization')}>
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
