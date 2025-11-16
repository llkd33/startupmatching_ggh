'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TaskListView from '@/components/tasks/TaskListView'
import TaskAnalyticsDashboard from '@/components/tasks/TaskAnalyticsDashboard'

export default function TasksPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [expertId, setExpertId] = useState<string | null>(null)
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        router.push('/auth/login')
        return
      }

      setUser(currentUser)

      // Get user's role and organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          organization_profiles(*),
          expert_profiles(*)
        `)
        .eq('id', currentUser.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        setLoading(false)
        return
      }

      const orgId = userData?.organization_profiles?.[0]?.id || userData?.organization_profiles?.id
      const expId = userData?.expert_profiles?.[0]?.id || userData?.expert_profiles?.id

      setOrganizationId(orgId || null)
      setExpertId(expId || null)

      // Fetch users for assignment (if organization)
      if (orgId) {
        const { data: orgUsers } = await supabase
          .from('users')
          .select('id, email, role')
          .order('email')
        
        setAssignableUsers(orgUsers || [])
      }

      // Fetch categories
      if (orgId) {
        const { data: cats } = await supabase
          .from('task_categories')
          .select('*')
          .eq('organization_id', orgId)
          .order('name')
        
        setCategories(cats || [])
      }

      // Fetch task statistics
      if (orgId) {
        const { data: stats } = await supabase
          .from('task_statistics')
          .select('*')
          .eq('organization_id', orgId)
          .single()
        
        setStatistics(stats)
      }
    } catch (err) {
      console.error('Error loading tasks page:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Management</h1>
        <p className="text-gray-600">Organize and track your tasks efficiently</p>
      </div>

      {/* Analytics Dashboard */}
      {statistics && (
        <div className="mb-8">
          <TaskAnalyticsDashboard statistics={statistics} />
        </div>
      )}

      {/* Task List */}
      <TaskListView
        organizationId={organizationId}
        expertId={expertId}
        userId={user.id}
        assignableUsers={assignableUsers}
        categories={categories}
        showCreateButton={true}
      />
    </div>
  )
}