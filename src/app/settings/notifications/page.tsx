'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Bell, CheckCircle2, MessageSquare, FileText, Calendar, ListTodo } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'

interface NotificationSettings {
  // Master toggle
  email_notifications: boolean

  // Activity notifications
  connection_request_email: boolean
  request_approved_email: boolean
  request_rejected_email: boolean

  // Proposal notifications
  new_proposal_email: boolean
  proposal_accepted_email: boolean
  proposal_rejected_email: boolean

  // Message notifications
  new_message_email: boolean

  // Campaign notifications
  campaign_deadline_email: boolean
  campaign_status_email: boolean

  // Task notifications
  task_assigned_email: boolean
  task_deadline_email: boolean

  // Marketing
  marketing_email: boolean
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    connection_request_email: true,
    request_approved_email: true,
    request_rejected_email: true,
    new_proposal_email: true,
    proposal_accepted_email: true,
    proposal_rejected_email: true,
    new_message_email: true,
    campaign_deadline_email: true,
    campaign_status_email: true,
    task_assigned_email: true,
    task_deadline_email: true,
    marketing_email: false
  })
  const [originalSettings, setOriginalSettings] = useState<NotificationSettings | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        const loadedSettings = {
          email_notifications: data.email_notifications ?? true,
          connection_request_email: data.connection_request_email ?? true,
          request_approved_email: data.request_approved_email ?? true,
          request_rejected_email: data.request_rejected_email ?? true,
          new_proposal_email: data.new_proposal_email ?? true,
          proposal_accepted_email: data.proposal_accepted_email ?? true,
          proposal_rejected_email: data.proposal_rejected_email ?? true,
          new_message_email: data.new_message_email ?? true,
          campaign_deadline_email: data.campaign_deadline_email ?? true,
          campaign_status_email: data.campaign_status_email ?? true,
          task_assigned_email: data.task_assigned_email ?? true,
          task_deadline_email: data.task_deadline_email ?? true,
          marketing_email: data.marketing_email ?? false
        }
        setSettings(loadedSettings)
        setOriginalSettings(loadedSettings)
      } else {
        // 설정이 없으면 기본값 사용
        setOriginalSettings(settings)
      }
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError('설정을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setOriginalSettings(settings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError(err.message || '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  const handleToggle = (key: keyof NotificationSettings) => {
    if (key === 'email_notifications') {
      // 마스터 토글: 모든 이메일 알림 on/off (마케팅 제외)
      const newValue = !settings.email_notifications
      setSettings({
        ...settings,
        email_notifications: newValue,
        connection_request_email: newValue,
        request_approved_email: newValue,
        request_rejected_email: newValue,
        new_proposal_email: newValue,
        proposal_accepted_email: newValue,
        proposal_rejected_email: newValue,
        new_message_email: newValue,
        campaign_deadline_email: newValue,
        campaign_status_email: newValue,
        task_assigned_email: newValue,
        task_deadline_email: newValue
      })
    } else {
      setSettings({
        ...settings,
        [key]: !settings[key]
      })
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
        <div>
          <h1 className="text-3xl font-bold">알림 설정</h1>
          <p className="text-gray-600 mt-1">이메일 알림을 관리하세요</p>
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
            <AlertDescription>설정이 저장되었습니다.</AlertDescription>
          </Alert>
        )}

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              이메일 알림
            </CardTitle>
            <CardDescription>
              중요한 활동에 대한 이메일 알림을 받으세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications" className="text-base font-medium">
                  모든 이메일 알림
                </Label>
                <p className="text-sm text-gray-500">
                  모든 이메일 알림을 한 번에 켜거나 끌 수 있습니다
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.email_notifications}
                onCheckedChange={() => handleToggle('email_notifications')}
              />
            </div>

            <div className="border-t pt-6 space-y-4">
              {/* Connection Request Emails */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="connection-request" className="text-base">
                    연결 요청 알림
                  </Label>
                  <p className="text-sm text-gray-500">
                    새로운 연결 요청을 받았을 때 이메일로 알림
                  </p>
                </div>
                <Switch
                  id="connection-request"
                  checked={settings.connection_request_email}
                  onCheckedChange={() => handleToggle('connection_request_email')}
                  disabled={!settings.email_notifications}
                />
              </div>

              {/* Request Approved Emails */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="request-approved" className="text-base">
                    연결 승인 알림
                  </Label>
                  <p className="text-sm text-gray-500">
                    연결 요청이 승인되었을 때 이메일로 알림
                  </p>
                </div>
                <Switch
                  id="request-approved"
                  checked={settings.request_approved_email}
                  onCheckedChange={() => handleToggle('request_approved_email')}
                  disabled={!settings.email_notifications}
                />
              </div>

              {/* Request Rejected Emails */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="request-rejected" className="text-base">
                    연결 거절 알림
                  </Label>
                  <p className="text-sm text-gray-500">
                    연결 요청이 거절되었을 때 이메일로 알림
                  </p>
                </div>
                <Switch
                  id="request-rejected"
                  checked={settings.request_rejected_email}
                  onCheckedChange={() => handleToggle('request_rejected_email')}
                  disabled={!settings.email_notifications}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              제안서 알림
            </CardTitle>
            <CardDescription>
              제안서 관련 이메일 알림을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-proposal" className="text-base">
                  새 제안서 알림
                </Label>
                <p className="text-sm text-gray-500">
                  새로운 제안서가 접수되었을 때 알림
                </p>
              </div>
              <Switch
                id="new-proposal"
                checked={settings.new_proposal_email}
                onCheckedChange={() => handleToggle('new_proposal_email')}
                disabled={!settings.email_notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="proposal-accepted" className="text-base">
                  제안서 수락 알림
                </Label>
                <p className="text-sm text-gray-500">
                  제안서가 수락되었을 때 알림
                </p>
              </div>
              <Switch
                id="proposal-accepted"
                checked={settings.proposal_accepted_email}
                onCheckedChange={() => handleToggle('proposal_accepted_email')}
                disabled={!settings.email_notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="proposal-rejected" className="text-base">
                  제안서 거절 알림
                </Label>
                <p className="text-sm text-gray-500">
                  제안서가 거절되었을 때 알림
                </p>
              </div>
              <Switch
                id="proposal-rejected"
                checked={settings.proposal_rejected_email}
                onCheckedChange={() => handleToggle('proposal_rejected_email')}
                disabled={!settings.email_notifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Message Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              메시지 알림
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-message" className="text-base">
                  새 메시지 알림
                </Label>
                <p className="text-sm text-gray-500">
                  새로운 메시지를 받았을 때 알림
                </p>
              </div>
              <Switch
                id="new-message"
                checked={settings.new_message_email}
                onCheckedChange={() => handleToggle('new_message_email')}
                disabled={!settings.email_notifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Campaign Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              캠페인 알림
            </CardTitle>
            <CardDescription>
              캠페인 관련 이메일 알림을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="campaign-deadline" className="text-base">
                  마감일 알림
                </Label>
                <p className="text-sm text-gray-500">
                  캠페인 마감일이 다가올 때 알림
                </p>
              </div>
              <Switch
                id="campaign-deadline"
                checked={settings.campaign_deadline_email}
                onCheckedChange={() => handleToggle('campaign_deadline_email')}
                disabled={!settings.email_notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="campaign-status" className="text-base">
                  상태 변경 알림
                </Label>
                <p className="text-sm text-gray-500">
                  캠페인 상태가 변경되었을 때 알림
                </p>
              </div>
              <Switch
                id="campaign-status"
                checked={settings.campaign_status_email}
                onCheckedChange={() => handleToggle('campaign_status_email')}
                disabled={!settings.email_notifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Task Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              태스크 알림
            </CardTitle>
            <CardDescription>
              태스크 관련 이메일 알림을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="task-assigned" className="text-base">
                  태스크 할당 알림
                </Label>
                <p className="text-sm text-gray-500">
                  새로운 태스크가 할당되었을 때 알림
                </p>
              </div>
              <Switch
                id="task-assigned"
                checked={settings.task_assigned_email}
                onCheckedChange={() => handleToggle('task_assigned_email')}
                disabled={!settings.email_notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="task-deadline" className="text-base">
                  마감일 알림
                </Label>
                <p className="text-sm text-gray-500">
                  태스크 마감일이 다가올 때 알림
                </p>
              </div>
              <Switch
                id="task-deadline"
                checked={settings.task_deadline_email}
                onCheckedChange={() => handleToggle('task_deadline_email')}
                disabled={!settings.email_notifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Marketing Emails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              마케팅 알림
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing" className="text-base">
                  뉴스 및 업데이트
                </Label>
                <p className="text-sm text-gray-500">
                  새로운 기능, 팁, 이벤트에 대한 소식을 받아보세요
                </p>
              </div>
              <Switch
                id="marketing"
                checked={settings.marketing_email}
                onCheckedChange={() => handleToggle('marketing_email')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '변경사항 저장'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}