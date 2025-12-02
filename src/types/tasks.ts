// Task Management Types

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority

  // User relationships
  creator_id: string
  assignee_id?: string
  updated_by?: string

  // Organization/Campaign relationships
  organization_id?: string
  campaign_id?: string
  expert_id?: string

  // Dates
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string

  // Additional fields
  estimated_hours?: number
  actual_hours?: number
  order_index: number
  is_archived: boolean
  metadata?: Record<string, unknown>

  // Relations (when fetched with joins)
  creator?: {
    id: string
    email: string
    role: string
  }
  assignee?: {
    id: string
    email: string
    role: string
  }
  categories?: TaskCategory[]
  comments?: TaskComment[]
  activity_logs?: TaskActivityLog[]
  attachments?: TaskAttachment[]
}

export interface TaskCategory {
  id: string
  name: string
  color: string
  description?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  is_edited: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
  }
}

export interface TaskActivityLog {
  id: string
  task_id: string
  user_id: string
  action: string
  old_value?: unknown
  new_value?: unknown
  description?: string
  created_at: string
  user?: {
    id: string
    email: string
  }
}

export interface TaskAttachment {
  id: string
  task_id: string
  uploaded_by: string
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  created_at: string
}

export interface TaskReminder {
  id: string
  task_id: string
  user_id: string
  remind_at: string
  is_sent: boolean
  sent_at?: string
  created_at: string
  task?: Task
}

export interface TaskStatistics {
  organization_id?: string
  todo_count: number
  in_progress_count: number
  completed_count: number
  cancelled_count: number
  on_hold_count: number
  overdue_count: number
  total_count: number
  avg_completion_hours?: number
}

export interface UserTaskAssignment {
  user_id: string
  email: string
  role: string
  todo_tasks: number
  in_progress_tasks: number
  completed_this_week: number
  overdue_tasks: number
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string
  organization_id?: string
  campaign_id?: string
  search?: string
  due_date_from?: string
  due_date_to?: string
  is_archived?: boolean
  category_ids?: string[]
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string
  organization_id?: string
  campaign_id?: string
  expert_id?: string
  due_date?: string
  estimated_hours?: number
  category_ids?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  category_ids?: string[]
  metadata?: Record<string, unknown>
}

// UI Helper Types
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold'
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'gray',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  on_hold: 'yellow'
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  urgent: 'red'
}

export const TASK_PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: '↓',
  medium: '→',
  high: '↑',
  urgent: '⚡'
}