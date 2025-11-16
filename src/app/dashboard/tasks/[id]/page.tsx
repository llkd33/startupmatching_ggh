import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TaskDetailView from '@/components/tasks/TaskDetailView'

export const metadata: Metadata = {
  title: 'Task Details - Startup Matching',
  description: 'View and manage task details',
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Fetch task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      *,
      creator:users!tasks_creator_id_fkey(id, email, role),
      assignee:users!tasks_assignee_id_fkey(id, email, role),
      task_category_relations(
        task_categories(*)
      ),
      comments:task_comments(
        *,
        user:users(id, email)
      ),
      activity_logs:task_activity_logs(
        *,
        user:users(id, email)
      ),
      attachments:task_attachments(*)
    `)
    .eq('id', id)
    .single()

  if (taskError || !task) {
    redirect('/dashboard/tasks')
  }

  // Fetch available users for assignment
  const { data: users } = await supabase
    .from('users')
    .select('id, email, role')
    .order('email')

  // Fetch available categories
  const { data: categories } = await supabase
    .from('task_categories')
    .select('*')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8">
      <TaskDetailView
        task={task}
        currentUserId={user.id}
        assignableUsers={users || []}
        categories={categories || []}
      />
    </div>
  )
}
