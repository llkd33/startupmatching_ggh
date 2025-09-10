'use client'

import { useState, useEffect, useMemo } from 'react'
import { db } from '@/lib/supabase'
import { 
  Task, 
  TaskFilters, 
  TaskStatus, 
  TaskPriority,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_ICONS
} from '@/types/tasks'
import {
  AlertCircle,
  Archive,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Filter,
  Flag,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Tag,
  Trash2,
  User,
  X
} from 'lucide-react'
import TaskCreateForm from './TaskCreateForm'
import TaskCard from './TaskCard'

interface TaskListViewProps {
  organizationId?: string
  campaignId?: string
  expertId?: string
  userId?: string
  showCreateButton?: boolean
  assignableUsers?: Array<{ id: string; email: string; role: string }>
  categories?: Array<{ id: string; name: string; color: string }>
  view?: 'list' | 'board' | 'calendar'
}

type SortField = 'created_at' | 'due_date' | 'priority' | 'status' | 'title'
type SortOrder = 'asc' | 'desc'

export default function TaskListView({
  organizationId,
  campaignId,
  expertId,
  userId,
  showCreateButton = true,
  assignableUsers = [],
  categories = [],
  view = 'list'
}: TaskListViewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [currentView, setCurrentView] = useState(view)
  
  // Filters
  const [filters, setFilters] = useState<TaskFilters>({
    is_archived: false,
    organization_id: organizationId,
    campaign_id: campaignId
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Load tasks
  useEffect(() => {
    loadTasks()
  }, [filters, organizationId, campaignId, expertId])

  const loadTasks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await db.tasks.list({
        ...filters,
        search: searchTerm || undefined
      })
      
      if (fetchError) throw fetchError
      setTasks(data || [])
    } catch (err: any) {
      console.error('Error loading tasks:', err)
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]
      
      // Special handling for priority
      if (sortField === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        aVal = priorityOrder[a.priority]
        bVal = priorityOrder[b.priority]
      }
      
      // Special handling for status
      if (sortField === 'status') {
        const statusOrder = { todo: 1, in_progress: 2, on_hold: 3, completed: 4, cancelled: 5 }
        aVal = statusOrder[a.status]
        bVal = statusOrder[b.status]
      }
      
      // Handle null values
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      // Compare
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }, [tasks, sortField, sortOrder])

  // Group tasks by status for board view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      on_hold: [],
      completed: [],
      cancelled: []
    }
    
    sortedTasks.forEach(task => {
      grouped[task.status].push(task)
    })
    
    return grouped
  }, [sortedTasks])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error: updateError } = await db.tasks.updateStatus(taskId, newStatus)
      if (updateError) throw updateError
      await loadTasks()
    } catch (err: any) {
      console.error('Error updating task status:', err)
      setError(err.message || 'Failed to update task status')
    }
  }

  const handleBulkAction = async (action: 'archive' | 'delete' | 'status', value?: any) => {
    if (selectedTasks.length === 0) return
    
    try {
      if (action === 'delete') {
        const confirmed = window.confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)?`)
        if (!confirmed) return
        
        const { error: deleteError } = await db.tasks.bulkDelete(selectedTasks)
        if (deleteError) throw deleteError
      } else if (action === 'archive') {
        const { error: updateError } = await db.tasks.bulkUpdate(selectedTasks, { is_archived: true })
        if (updateError) throw updateError
      } else if (action === 'status' && value) {
        const { error: updateError } = await db.tasks.bulkUpdate(selectedTasks, { status: value })
        if (updateError) throw updateError
      }
      
      setSelectedTasks([])
      await loadTasks()
    } catch (err: any) {
      console.error('Error performing bulk action:', err)
      setError(err.message || 'Failed to perform bulk action')
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const selectAllTasks = () => {
    if (selectedTasks.length === sortedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(sortedTasks.map(t => t.id))
    }
  }

  const getOverdueStatus = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false
    }
    return new Date(task.due_date) < new Date()
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setCurrentView('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                currentView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setCurrentView('board')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                currentView === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Board
            </button>
          </div>
          
          {showCreateButton && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border rounded-lg">
          <TaskCreateForm
            organizationId={organizationId}
            campaignId={campaignId}
            expertId={expertId}
            assignableUsers={assignableUsers}
            categories={categories}
            onSuccess={() => {
              setShowCreateForm(false)
              loadTasks()
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTasks()}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.keys(filters).filter(k => k !== 'is_archived' && filters[k]).length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                {Object.keys(filters).filter(k => k !== 'is_archived' && filters[k]).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as TaskPriority || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Assignee Filter */}
              {assignableUsers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <select
                    value={filters.assignee_id || ''}
                    onChange={(e) => setFilters({ ...filters, assignee_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Assignees</option>
                    <option value="unassigned">Unassigned</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Archive Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Show</label>
                <select
                  value={filters.is_archived ? 'archived' : 'active'}
                  onChange={(e) => setFilters({ ...filters, is_archived: e.target.value === 'archived' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active Tasks</option>
                  <option value="archived">Archived Tasks</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFilters({
                    is_archived: false,
                    organization_id: organizationId,
                    campaign_id: campaignId
                  })
                  setSearchTerm('')
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedTasks.length === sortedTasks.length}
              onChange={selectAllTasks}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-blue-900">
              {selectedTasks.length} task(s) selected
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('archive')}
              className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Task List or Board */}
      {currentView === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* List Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedTasks.length === sortedTasks.length && sortedTasks.length > 0}
                onChange={selectAllTasks}
                className="rounded border-gray-300"
              />
            </div>
            <div 
              className="col-span-4 cursor-pointer hover:text-gray-900 flex items-center gap-1"
              onClick={() => handleSort('title')}
            >
              Title
              {sortField === 'title' && (
                <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </div>
            <div 
              className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center gap-1"
              onClick={() => handleSort('status')}
            >
              Status
              {sortField === 'status' && (
                <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </div>
            <div 
              className="col-span-1 cursor-pointer hover:text-gray-900 flex items-center gap-1"
              onClick={() => handleSort('priority')}
            >
              Priority
              {sortField === 'priority' && (
                <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </div>
            <div className="col-span-2">Assignee</div>
            <div 
              className="col-span-1 cursor-pointer hover:text-gray-900 flex items-center gap-1"
              onClick={() => handleSort('due_date')}
            >
              Due
              {sortField === 'due_date' && (
                <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Task Rows */}
          <div>
            {sortedTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No tasks found. {showCreateButton && 'Create your first task to get started.'}
              </div>
            ) : (
              sortedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  view="list"
                  selected={selectedTasks.includes(task.id)}
                  onSelect={() => toggleTaskSelection(task.id)}
                  onStatusChange={(status) => handleStatusChange(task.id, status)}
                  onRefresh={loadTasks}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        // Board View
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="flex-shrink-0 w-80">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-${TASK_STATUS_COLORS[status as TaskStatus]}-500`} />
                    {TASK_STATUS_LABELS[status as TaskStatus]}
                  </h3>
                  <span className="text-sm text-gray-500">{statusTasks.length}</span>
                </div>
                
                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      view="board"
                      selected={selectedTasks.includes(task.id)}
                      onSelect={() => toggleTaskSelection(task.id)}
                      onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                      onRefresh={loadTasks}
                    />
                  ))}
                  
                  {statusTasks.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}