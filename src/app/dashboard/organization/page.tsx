'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  CheckCircle2,
  Edit,
  Save,
  X,
  Loader2,
  Briefcase,
  Calendar
} from 'lucide-react'

export default function OrganizationProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [formData, setFormData] = useState({
    organization_name: '',
    business_number: '',
    representative_name: '',
    contact_position: '',
    industry: '',
    employee_count: '',
    website: '',
    description: '',
    address: '',
    phone: '',
    email: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadOrganizationProfile()
  }, [])

  const loadOrganizationProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check user role
      const { data: userData } = await supabase
        .from('users')
        .select('role, email, phone')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'organization') {
        router.push('/dashboard')
        return
      }

      // Get organization profile
      const { data: profile, error: profileError } = await supabase
        .from('organization_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError)
        setError('프로필을 불러오는 중 오류가 발생했습니다.')
      }

      if (profile) {
        setOrganizationData(profile)
        setFormData({
          organization_name: profile.organization_name || '',
          business_number: profile.business_number || '',
          representative_name: profile.representative_name || '',
          contact_position: profile.contact_position || '',
          industry: profile.industry || '',
          employee_count: profile.employee_count || '',
          website: profile.website || '',
          description: profile.description || '',
          address: profile.address || '',
          phone: userData.phone || '',
          email: userData.email || ''
        })
      } else {
        // If no profile exists, create one
        const { data: newProfile, error: createError } = await supabase
          .from('organization_profiles')
          .insert({
            user_id: user.id,
            organization_name: '',
            representative_name: '',
            is_verified: false
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          setError('프로필 생성 중 오류가 발생했습니다.')
        } else {
          setOrganizationData(newProfile)
          setFormData({
            ...formData,
            email: userData.email || '',
            phone: userData.phone || ''
          })
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !organizationData) {
        setError('인증 정보를 확인할 수 없습니다.')
        return
      }

      // Update organization profile
      const { error: updateError } = await supabase
        .from('organization_profiles')
        .update({
          organization_name: formData.organization_name,
          business_number: formData.business_number,
          representative_name: formData.representative_name,
          contact_position: formData.contact_position,
          industry: formData.industry,
          employee_count: formData.employee_count,
          website: formData.website,
          description: formData.description,
          address: formData.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationData.id)

      if (updateError) throw updateError

      // Update phone in users table if changed
      if (formData.phone) {
        await supabase
          .from('users')
          .update({ phone: formData.phone })
          .eq('id', user.id)
      }

      setSuccess('프로필이 성공적으로 업데이트되었습니다.')
      setEditing(false)
      await loadOrganizationProfile()
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">기관 프로필</h1>
            <p className="text-gray-600 mt-1">기관 정보를 관리하고 업데이트하세요</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    loadOrganizationProfile()
                  }}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className={`w-5 h-5 ${organizationData?.is_verified ? 'text-green-500' : 'text-gray-400'}`} />
              인증 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organizationData?.is_verified ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">인증 완료</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">
                  기관 인증이 완료되지 않았습니다. 인증 후 모든 기능을 이용할 수 있습니다.
                </p>
                <Button variant="outline" size="sm">
                  인증 요청
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="organization_name">기관명 *</Label>
                <Input
                  id="organization_name"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  disabled={!editing}
                  placeholder="예: 스타트업 지원센터"
                />
              </div>
              <div>
                <Label htmlFor="business_number">사업자등록번호</Label>
                <Input
                  id="business_number"
                  value={formData.business_number}
                  onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                  disabled={!editing}
                  placeholder="000-00-00000"
                />
              </div>
              <div>
                <Label htmlFor="representative_name">대표자명 *</Label>
                <Input
                  id="representative_name"
                  value={formData.representative_name}
                  onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                  disabled={!editing}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <Label htmlFor="contact_position">담당자 직책</Label>
                <Input
                  id="contact_position"
                  value={formData.contact_position}
                  onChange={(e) => setFormData({ ...formData, contact_position: e.target.value })}
                  disabled={!editing}
                  placeholder="매니저"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              연락처 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-10 bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">전화번호</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editing}
                    placeholder="010-0000-0000"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="website">웹사이트</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={!editing}
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">주소</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!editing}
                    placeholder="서울시 강남구..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              기관 상세 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">산업 분야</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  disabled={!editing}
                  placeholder="예: IT, 제조업, 서비스업"
                />
              </div>
              <div>
                <Label htmlFor="employee_count">직원 수</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="employee_count"
                    value={formData.employee_count}
                    onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })}
                    disabled={!editing}
                    placeholder="예: 10-50명"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="description">기관 소개</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={!editing}
                placeholder="기관에 대한 간단한 소개를 작성해주세요..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              추가 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">가입일:</span>{' '}
                {organizationData?.created_at ? 
                  new Date(organizationData.created_at).toLocaleDateString('ko-KR') : 
                  '-'
                }
              </p>
              <p>
                <span className="font-medium">마지막 업데이트:</span>{' '}
                {organizationData?.updated_at ? 
                  new Date(organizationData.updated_at).toLocaleDateString('ko-KR') : 
                  '-'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}