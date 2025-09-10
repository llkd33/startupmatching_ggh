'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { db } from '@/lib/supabase'
import { TaskStatistics } from '@/types/tasks'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Calendar,
  ChevronRight
} from 'lucide-react'

interface TaskDashboardWidgetProps {
  organizationId?: string
  userId?: string
}

export default function TaskDashboardWidget({ organizationId, userId }: TaskDashboardWidgetProps) {
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null)
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTaskData()
  }, [organizationId, userId])

  const loadTaskData = async () => {
    try {
      // Load statistics
      if (organizationId) {
        const { data: stats } = await db.tasks.getStatistics(organizationId)
        if (stats) setStatistics(stats)
      }

      // Load recent tasks
      const { data: tasks } = await db.tasks.list({
        organization_id: organizationId,
        is_archived: false
      })

      if (tasks) {
        // Get top 5 most recent or urgent tasks
        const sortedTasks = tasks
          .sort((a, b) => {
            // Prioritize overdue and high priority tasks
            if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
            if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
            
            const aOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
            const bOverdue = b.due_date && new Date(b.due_date) < new Date() && b.status !== 'completed'
            
            if (aOverdue && !bOverdue) return -1
            if (bOverdue && !aOverdue) return 1
            
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          .slice(0, 5)
        
        setRecentTasks(sortedTasks)
      }
    } catch (error) {
      console.error('Error loading task data:', error)
    } finally {
      setLoading(false)
    }
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      on_hold: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityIcon = (priority: string) => {
    const icons: Record<string, string> = {
      low: '↓',
      medium: '→',
      high: '↑',
      urgent: '⚡'
    }
    return icons[priority] || '→'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Task Management</h3>
              <p className="text-sm text-gray-500">Track and manage your tasks</p>
            </div>
          </div>
          <Link
            href="/dashboard/tasks"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{statistics.todo_count}</div>
            <div className="text-xs text-gray-500">To Do</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.in_progress_count}</div>
            <div className="text-xs text-gray-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.completed_count}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.overdue_count}</div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent & Urgent Tasks</h4>
        
        {recentTasks.length > 0 ? (
          <div className="space-y-3">
            {recentTasks.map((task) => {
              const isOverdue = task.due_date && 
                new Date(task.due_date) < new Date() && 
                task.status !== 'completed' && 
                task.status !== 'cancelled'
              
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900 line-clamp-1 flex-1">
                      {task.title}
                    </h5>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    
                    {task.priority && (
                      <span className="text-gray-600">
                        {getPriorityIcon(task.priority)} {task.priority}
                      </span>
                    )}
                    
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDueDate(task.due_date)}
                      </span>
                    )}
                    
                    {task.assignee && (
                      <span className="text-gray-500 truncate">
                        {task.assignee.email.split('@')[0]}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tasks yet</p>
            <Link
              href="/dashboard/tasks"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
            >
              Create your first task →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/tasks?showCreate=true"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 text-center transition-colors"
          >
            Create Task
          </Link>
          <Link
            href="/dashboard/tasks?view=board"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 text-center transition-colors"
          >
            Task Board
          </Link>
        </div>
      </div>
    </div>
  )
}