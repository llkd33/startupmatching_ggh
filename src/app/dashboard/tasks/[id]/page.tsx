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

  // Fetch task details (categories는 별도로 조회)
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      *,
      creator:users!tasks_creator_id_fkey(id, email, role),
      assignee:users!tasks_assignee_id_fkey(id, email, role),
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

  // Categories를 별도로 조회하여 병합
  let taskCategories: any[] = []
  try {
    const { data: relations } = await supabase
      .from('task_category_relations')
      .select('category_id')
      .eq('task_id', id)

    const categoryIds = relations?.map((r: any) => r.category_id).filter(Boolean) || []
    
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('task_categories')
        .select('*')
        .in('id', categoryIds)
      
      taskCategories = cats || []
    }
  } catch (err) {
    console.warn('Error loading task categories:', err)
  }

  // task에 categories 추가
  const taskWithCategories = {
    ...task,
    categories: taskCategories,
    task_category_relations: []
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
        task={taskWithCategories}
        currentUserId={user.id}
        assignableUsers={users || []}
        categories={categories || []}
      />
    </div>
  )
}
