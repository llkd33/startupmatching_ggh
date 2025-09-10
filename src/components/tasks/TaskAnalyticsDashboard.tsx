'use client'

import { TaskStatistics } from '@/types/tasks'
import {
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  Target
} from 'lucide-react'

interface TaskAnalyticsDashboardProps {
  statistics: TaskStatistics
}

export default function TaskAnalyticsDashboard({ statistics }: TaskAnalyticsDashboardProps) {
  const completionRate = statistics.total_count > 0
    ? Math.round((statistics.completed_count / statistics.total_count) * 100)
    : 0

  const activeTasksCount = statistics.todo_count + statistics.in_progress_count

  const metrics = [
    {
      label: 'Total Tasks',
      value: statistics.total_count,
      icon: BarChart3,
      color: 'blue',
      description: 'All tasks in the system'
    },
    {
      label: 'Active Tasks',
      value: activeTasksCount,
      icon: Clock,
      color: 'yellow',
      description: 'To Do + In Progress'
    },
    {
      label: 'Completed',
      value: statistics.completed_count,
      icon: CheckCircle,
      color: 'green',
      description: `${completionRate}% completion rate`
    },
    {
      label: 'Overdue',
      value: statistics.overdue_count,
      icon: AlertTriangle,
      color: 'red',
      description: 'Tasks past due date'
    }
  ]

  const statusBreakdown = [
    { label: 'To Do', value: statistics.todo_count, color: 'gray' },
    { label: 'In Progress', value: statistics.in_progress_count, color: 'blue' },
    { label: 'On Hold', value: statistics.on_hold_count, color: 'yellow' },
    { label: 'Completed', value: statistics.completed_count, color: 'green' },
    { label: 'Cancelled', value: statistics.cancelled_count, color: 'red' }
  ]

  const maxStatusCount = Math.max(...statusBreakdown.map(s => s.value))

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 bg-${metric.color}-100 rounded-lg`}>
                  <Icon className={`w-5 h-5 text-${metric.color}-600`} />
                </div>
                {metric.label === 'Completed' && (
                  <span className="text-sm font-medium text-green-600">
                    {completionRate}%
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-sm text-gray-500 mt-1">{metric.label}</p>
                {metric.description && (
                  <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Task Status Distribution</h3>
        
        <div className="space-y-3">
          {statusBreakdown.map((status) => (
            <div key={status.label} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600">{status.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full bg-${status.color}-500 rounded-full transition-all duration-500`}
                      style={{ width: `${maxStatusCount > 0 ? (status.value / maxStatusCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {status.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Completion Time */}
        {statistics.avg_completion_hours && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Performance</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Average Completion Time</p>
                <p className="text-xl font-bold text-gray-900">
                  {Math.round(statistics.avg_completion_hours)} hours
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Tasks Completed This Week</p>
                <p className="text-xl font-bold text-gray-900">
                  {statistics.completed_count}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Quick Insights</h3>
          </div>
          
          <div className="space-y-3">
            {statistics.overdue_count > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-900">Overdue tasks need attention</span>
                </div>
                <span className="text-sm font-bold text-red-600">{statistics.overdue_count}</span>
              </div>
            )}
            
            {activeTasksCount > 10 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-900">High workload detected</span>
                </div>
                <span className="text-sm font-bold text-yellow-600">{activeTasksCount} active</span>
              </div>
            )}
            
            {completionRate > 70 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-900">Great completion rate!</span>
                </div>
                <span className="text-sm font-bold text-green-600">{completionRate}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}