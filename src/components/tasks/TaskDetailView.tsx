'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/supabase'
import {
  Task,
  TaskComment,
  TaskActivityLog,
  TaskStatus,
  TaskPriority,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_ICONS
} from '@/types/tasks'
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Flag,
  MessageSquare,
  MoreVertical,
  Plus,
  Send,
  Tag,
  Trash2,
  User,
  Activity,
  Paperclip
} from 'lucide-react'

interface TaskDetailViewProps {
  task: Task & {
    comments: TaskComment[]
    activity_logs: TaskActivityLog[]
  }
  currentUserId: string
  assignableUsers: Array<{ id: string; email: string; role: string }>
  categories: Array<{ id: string; name: string; color: string }>
}

export default function TaskDetailView({
  task: initialTask,
  currentUserId,
  assignableUsers,
  categories
}: TaskDetailViewProps) {
  const router = useRouter()
  const [task, setTask] = useState(initialTask)
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments')
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    assignee_id: task.assignee_id || '',
    due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    estimated_hours: task.estimated_hours || '',
    actual_hours: task.actual_hours || ''
  })

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const { data: updatedTask, error } = await db.tasks.update(task.id, {
        ...editForm,
        estimated_hours: editForm.estimated_hours ? Number(editForm.estimated_hours) : undefined,
        actual_hours: editForm.actual_hours ? Number(editForm.actual_hours) : undefined
      })
      
      if (error) throw error
      
      // Refresh task data
      const { data: refreshedTask } = await db.tasks.get(task.id)
      if (refreshedTask) {
        setTask(refreshedTask as any)
      }
      
      setEditing(false)
    } catch (err: any) {
      console.error('Error updating task:', err)
      alert('Failed to update task')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setUpdating(true)
    try {
      const { error } = await db.tasks.updateStatus(task.id, newStatus)
      if (error) throw error
      
      // Refresh task data
      const { data: refreshedTask } = await db.tasks.get(task.id)
      if (refreshedTask) {
        setTask(refreshedTask as any)
      }
    } catch (err: any) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    
    setSubmittingComment(true)
    try {
      const { error } = await db.tasks.addComment(task.id, commentText)
      if (error) throw error
      
      // Refresh task data
      const { data: refreshedTask } = await db.tasks.get(task.id)
      if (refreshedTask) {
        setTask(refreshedTask as any)
      }
      
      setCommentText('')
    } catch (err: any) {
      console.error('Error adding comment:', err)
      alert('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    
    try {
      const { error } = await db.tasks.delete(task.id)
      if (error) throw error
      router.push('/dashboard/tasks')
    } catch (err: any) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task')
    }
  }

  const handleArchive = async () => {
    try {
      const { error } = await db.tasks.archive(task.id)
      if (error) throw error
      router.push('/dashboard/tasks')
    } catch (err: any) {
      console.error('Error archiving task:', err)
      alert('Failed to archive task')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatActivityAction = (log: TaskActivityLog) => {
    switch (log.action) {
      case 'created':
        return 'created this task'
      case 'status_changed':
        return `changed status from ${log.old_value?.status} to ${log.new_value?.status}`
      case 'assigned':
        return `changed assignee`
      case 'priority_changed':
        return `changed priority from ${log.old_value?.priority} to ${log.new_value?.priority}`
      default:
        return log.description || log.action
    }
  }

  const isOverdue = task.due_date && 
    new Date(task.due_date) < new Date() && 
    task.status !== 'completed' && 
    task.status !== 'cancelled'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/tasks')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </button>
        
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleArchive}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {editing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full text-2xl font-bold px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Task title"
                />
                
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Description"
                  rows={4}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TaskStatus })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                    <select
                      value={editForm.assignee_id}
                      onChange={(e) => setEditForm({ ...editForm, assignee_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Unassigned</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id} value={user.id}>{user.email}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      value={editForm.estimated_hours}
                      onChange={(e) => setEditForm({ ...editForm, estimated_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actual Hours</label>
                    <input
                      type="number"
                      value={editForm.actual_hours}
                      onChange={(e) => setEditForm({ ...editForm, actual_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setEditing(false)
                      setEditForm({
                        title: task.title,
                        description: task.description || '',
                        status: task.status,
                        priority: task.priority,
                        assignee_id: task.assignee_id || '',
                        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
                        estimated_hours: task.estimated_hours || '',
                        actual_hours: task.actual_hours || ''
                      })
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={updating}
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{task.title}</h1>
                
                {task.description && (
                  <p className="text-gray-600 mb-6 whitespace-pre-wrap">{task.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 mb-6">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                      disabled={updating}
                      className={`px-3 py-1 rounded-md text-sm font-medium bg-${TASK_STATUS_COLORS[task.status]}-100 text-${TASK_STATUS_COLORS[task.status]}-800 border border-${TASK_STATUS_COLORS[task.status]}-200`}
                    >
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Priority */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Priority:</span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-${TASK_PRIORITY_COLORS[task.priority]}-100 text-${TASK_PRIORITY_COLORS[task.priority]}-800`}>
                      <span>{TASK_PRIORITY_ICONS[task.priority]}</span>
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Assignee:</span>
                    <span className="font-medium">
                      {task.assignee ? task.assignee.email : 'Unassigned'}
                    </span>
                  </div>
                  
                  {task.due_date && (
                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>Due:</span>
                      <span className="font-medium">{formatDate(task.due_date)}</span>
                    </div>
                  )}
                  
                  {task.estimated_hours && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Estimated:</span>
                      <span className="font-medium">{task.estimated_hours} hours</span>
                    </div>
                  )}
                  
                  {task.actual_hours && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Actual:</span>
                      <span className="font-medium">{task.actual_hours} hours</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Comments and Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'comments'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments ({task.comments?.length || 0})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'activity'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4" />
                    Activity
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'comments' ? (
                <div className="space-y-4">
                  {/* Comment Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submittingComment}
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Comments List */}
                  {task.comments && task.comments.length > 0 ? (
                    <div className="space-y-3">
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                            {comment.user?.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.user?.email || 'Unknown'}</span>
                              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                              {comment.is_edited && (
                                <span className="text-xs text-gray-400">(edited)</span>
                              )}
                            </div>
                            <p className="text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No comments yet</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {task.activity_logs && task.activity_logs.length > 0 ? (
                    task.activity_logs.map((log) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{log.user?.email || 'System'}</span>
                            {' '}
                            <span className="text-gray-600">{formatActivityAction(log)}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No activity yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Task Information</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Created by:</span>
                <p className="font-medium">{task.creator?.email || 'Unknown'}</p>
              </div>
              
              <div>
                <span className="text-gray-500">Created:</span>
                <p className="font-medium">{formatDate(task.created_at)}</p>
              </div>
              
              {task.updated_at !== task.created_at && (
                <div>
                  <span className="text-gray-500">Last updated:</span>
                  <p className="font-medium">{formatDate(task.updated_at)}</p>
                </div>
              )}
              
              {task.completed_at && (
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <p className="font-medium">{formatDate(task.completed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          {task.categories && task.categories.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Categories</h3>
              
              <div className="flex flex-wrap gap-2">
                {task.categories.map((cat: any) => (
                  <span
                    key={cat.category.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: cat.category.color + '20',
                      color: cat.category.color
                    }}
                  >
                    <Tag className="w-3 h-3" />
                    {cat.category.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Attachments</h3>
              
              <div className="space-y-2">
                {task.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Paperclip className="w-4 h-4" />
                    {attachment.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}