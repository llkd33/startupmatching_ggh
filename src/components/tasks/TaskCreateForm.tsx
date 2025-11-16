'use client'

import { useState } from 'react'
import { db } from '@/lib/supabase'
import { CreateTaskInput, TaskPriority, TaskStatus, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/types/tasks'
import { AlertCircle, Calendar, Clock, Flag, Tag, User, X } from 'lucide-react'

interface TaskCreateFormProps {
  organizationId?: string
  campaignId?: string
  expertId?: string
  onSuccess?: (task: any) => void
  onCancel?: () => void
  assignableUsers?: Array<{ id: string; email: string; role: string }>
  categories?: Array<{ id: string; name: string; color: string }>
}

export default function TaskCreateForm({
  organizationId,
  campaignId,
  expertId,
  onSuccess,
  onCancel,
  assignableUsers = [],
  categories = []
}: TaskCreateFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: '',
    organization_id: organizationId,
    campaign_id: campaignId,
    expert_id: expertId,
    due_date: '',
    estimated_hours: undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (!formData.title.trim()) {
      setError('Task title is required')
      return
    }
    
    if (formData.title.length < 3) {
      setError('Task title must be at least 3 characters')
      return
    }
    
    if (formData.estimated_hours && (formData.estimated_hours < 0 || formData.estimated_hours > 999)) {
      setError('Estimated hours must be between 0 and 999')
      return
    }
    
    if (formData.due_date && new Date(formData.due_date) < new Date()) {
      const confirmPastDate = window.confirm('The due date is in the past. Do you want to continue?')
      if (!confirmPastDate) return
    }
    
    setLoading(true)
    
    try {
      // 빈 문자열을 undefined로 변환하여 UUID 필드 오류 방지
      const taskData: any = {
        title: formData.title.trim(),
      }

      // 선택적 필드 추가 (빈 문자열이 아닌 경우만)
      if (formData.description?.trim()) {
        taskData.description = formData.description.trim()
      }
      if (formData.status) {
        taskData.status = formData.status
      }
      if (formData.priority) {
        taskData.priority = formData.priority
      }
      
      // UUID 필드들은 빈 문자열이 아닌 경우에만 추가
      const assigneeId = formData.assignee_id?.trim()
      if (assigneeId && assigneeId !== '') {
        taskData.assignee_id = assigneeId
      }
      
      const orgId = organizationId || formData.organization_id?.trim()
      if (orgId && orgId !== '') {
        taskData.organization_id = orgId
      }
      
      const campId = campaignId || formData.campaign_id?.trim()
      if (campId && campId !== '') {
        taskData.campaign_id = campId
      }
      
      const expId = expertId || formData.expert_id?.trim()
      if (expId && expId !== '') {
        taskData.expert_id = expId
      }
      
      const dueDate = formData.due_date?.trim()
      if (dueDate && dueDate !== '') {
        taskData.due_date = dueDate
      }
      
      if (formData.estimated_hours !== undefined && formData.estimated_hours !== null) {
        taskData.estimated_hours = Number(formData.estimated_hours)
      }

      // Create the task
      const { data: task, error: taskError } = await db.tasks.create(taskData)
      
      if (taskError) throw taskError
      
      // Assign categories if selected
      if (task && selectedCategories.length > 0) {
        await db.taskCategories.assignToTask(task.id, selectedCategories)
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee_id: '',
        organization_id: organizationId,
        campaign_id: campaignId,
        expert_id: expertId,
        due_date: '',
        estimated_hours: undefined,
      })
      setSelectedCategories([])
      
      if (onSuccess) {
        onSuccess(task)
      }
    } catch (err: any) {
      console.error('Error creating task:', err)
      setError(err.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter task title"
            maxLength={255}
            required
          />
        </div>
        
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter task description (optional)"
            rows={4}
          />
        </div>
        
        {/* Status and Priority Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Status
              </div>
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Flag className="w-4 h-4" />
                Priority
              </div>
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Assignee and Due Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assignee */}
          {assignableUsers.length > 0 && (
            <div>
              <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Assign To
                </div>
              </label>
              <select
                id="assignee"
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Due Date
              </div>
            </label>
            <input
              type="datetime-local"
              id="due_date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Estimated Hours */}
        <div>
          <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Estimated Hours
            </div>
          </label>
          <input
            type="number"
            id="estimated_hours"
            value={formData.estimated_hours || ''}
            onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0"
            min="0"
            max="999"
            step="0.5"
          />
        </div>
        
        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                Categories
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategories.includes(category.id)
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedCategories.includes(category.id) ? category.color + '20' : undefined,
                    color: selectedCategories.includes(category.id) ? category.color : undefined,
                    borderColor: selectedCategories.includes(category.id) ? category.color : undefined
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !formData.title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}