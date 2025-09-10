'use client'

import { useState } from 'react'
import { db } from '@/lib/supabase'
import {
  Task,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_ICONS
} from '@/types/tasks'
import {
  Archive,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Flag,
  MessageSquare,
  MoreVertical,
  Tag,
  Trash2,
  User,
  XCircle
} from 'lucide-react'

interface TaskCardProps {
  task: Task
  view: 'list' | 'board'
  selected: boolean
  onSelect: () => void
  onStatusChange: (status: TaskStatus) => void
  onRefresh: () => void
}

export default function TaskCard({
  task,
  view,
  selected,
  onSelect,
  onStatusChange,
  onRefresh
}: TaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [updating, setUpdating] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    
    try {
      setUpdating(true)
      const { error } = await db.tasks.delete(task.id)
      if (error) throw error
      onRefresh()
    } catch (err: any) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task')
    } finally {
      setUpdating(false)
    }
  }

  const handleArchive = async () => {
    try {
      setUpdating(true)
      const { error } = await db.tasks.archive(task.id)
      if (error) throw error
      onRefresh()
    } catch (err: any) {
      console.error('Error archiving task:', err)
      alert('Failed to archive task')
    } finally {
      setUpdating(false)
    }
  }

  const getOverdueStatus = () => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false
    }
    return new Date(task.due_date) < new Date()
  }

  const formatDueDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = d.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = getOverdueStatus()

  if (view === 'board') {
    return (
      <div className={`bg-white rounded-md p-3 shadow-sm border ${selected ? 'border-blue-500' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between mb-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 rounded border-gray-300"
            disabled={updating}
          />
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={updating}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setShowActions(false)
                    // Navigate to edit page
                    window.location.href = `/dashboard/tasks/${task.id}/edit`
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowActions(false)
                    handleArchive()
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
                <button
                  onClick={() => {
                    setShowActions(false)
                    handleDelete()
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{task.title}</h3>
        
        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="space-y-2">
          {/* Priority */}
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${TASK_PRIORITY_COLORS[task.priority]}-100 text-${TASK_PRIORITY_COLORS[task.priority]}-800`}>
            <span>{TASK_PRIORITY_ICONS[task.priority]}</span>
            {task.priority}
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar className="w-3 h-3" />
              {formatDueDate(task.due_date)}
            </div>
          )}

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              {task.assignee.email.split('@')[0]}
            </div>
          )}

          {/* Comments Count */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          disabled={updating}
          className={`mt-3 w-full px-2 py-1 text-xs rounded border border-gray-200 bg-${TASK_STATUS_COLORS[task.status]}-50 text-${TASK_STATUS_COLORS[task.status]}-800 font-medium`}
        >
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    )
  }

  // List View
  return (
    <div className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}>
      <div className="col-span-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="rounded border-gray-300"
          disabled={updating}
        />
      </div>
      
      <div className="col-span-4">
        <a href={`/dashboard/tasks/${task.id}`} className="hover:text-blue-600">
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
          )}
        </a>
        
        {/* Categories */}
        {task.categories && task.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.categories.map((cat: any) => (
              <span
                key={cat.category.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
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
        )}
      </div>
      
      <div className="col-span-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          disabled={updating}
          className={`px-2 py-1 text-sm rounded border border-gray-200 bg-${TASK_STATUS_COLORS[task.status]}-50 text-${TASK_STATUS_COLORS[task.status]}-800 font-medium`}
        >
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      
      <div className="col-span-1">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${TASK_PRIORITY_COLORS[task.priority]}-100 text-${TASK_PRIORITY_COLORS[task.priority]}-800`}>
          <span>{TASK_PRIORITY_ICONS[task.priority]}</span>
          {task.priority}
        </span>
      </div>
      
      <div className="col-span-2">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-white">
              {task.assignee.email[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-700">{task.assignee.email.split('@')[0]}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </div>
      
      <div className="col-span-1">
        {task.due_date && (
          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {formatDueDate(task.due_date)}
          </div>
        )}
      </div>
      
      <div className="col-span-1">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 hover:bg-gray-200 rounded"
            disabled={updating}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <button
                onClick={() => {
                  setShowActions(false)
                  window.location.href = `/dashboard/tasks/${task.id}/edit`
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowActions(false)
                  handleArchive()
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button
                onClick={() => {
                  setShowActions(false)
                  handleDelete()
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}