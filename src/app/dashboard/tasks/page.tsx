import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TaskListView from '@/components/tasks/TaskListView'
import TaskAnalyticsDashboard from '@/components/tasks/TaskAnalyticsDashboard'

export const metadata: Metadata = {
  title: 'Tasks - Startup Matching',
  description: 'Manage your tasks and projects',
}

export default async function TasksPage() {
  const supabase = createServerSupabaseClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's role and organization
  const { data: userData } = await supabase
    .from('users')
    .select(`
      *,
      organization_profiles(*),
      expert_profiles(*)
    `)
    .eq('id', user.id)
    .single()

  const organizationId = userData?.organization_profiles?.[0]?.id || userData?.organization_profiles?.id
  const expertId = userData?.expert_profiles?.[0]?.id || userData?.expert_profiles?.id

  // Fetch users for assignment (if organization)
  let assignableUsers = []
  if (organizationId) {
    const { data: orgUsers } = await supabase
      .from('users')
      .select('id, email, role')
      .order('email')
    
    assignableUsers = orgUsers || []
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from('task_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')

  // Fetch task statistics
  const { data: statistics } = await supabase
    .from('task_statistics')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

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
        categories={categories || []}
        showCreateButton={true}
      />
    </div>
  )
}