# Task Management System Setup Guide

## Overview
A comprehensive task management system has been implemented for the Startup Matching platform. This system allows organizations and experts to create, manage, and track tasks with advanced features like categories, comments, activity logs, and analytics.

## Database Setup

### 1. Run the Database Migration
Execute the SQL script to create all necessary tables and relationships:

```bash
# Connect to your Supabase database and run:
psql -h your-database-host -U postgres -d your-database-name < supabase_tasks_schema.sql
```

Or paste the contents of `supabase_tasks_schema.sql` into the Supabase SQL Editor and execute.

### 2. Database Tables Created
- `tasks` - Main tasks table with status, priority, assignments
- `task_categories` - Categories/labels for organizing tasks
- `task_category_relations` - Many-to-many relationship for task categories
- `task_comments` - Comments on tasks
- `task_activity_logs` - Activity history and audit trail
- `task_attachments` - File attachments for tasks
- `task_reminders` - Reminder notifications
- `task_statistics` (view) - Aggregated statistics
- `user_task_assignments` (view) - User assignment summary

## Features Implemented

### ✅ Core Task Management
- **Create Tasks**: Form with validation for title, description, status, priority, assignee, due date
- **Update Tasks**: Edit all task fields with real-time updates
- **Delete Tasks**: Soft delete with archiving option
- **Task Status**: todo, in_progress, completed, cancelled, on_hold
- **Task Priority**: low, medium, high, urgent with visual indicators

### ✅ Task Organization
- **Categories/Labels**: Create and assign multiple categories to tasks
- **Filtering**: Filter by status, priority, assignee, date range, categories
- **Sorting**: Sort by title, status, priority, due date, created date
- **Search**: Full-text search across title and description
- **Views**: List view and Kanban board view

### ✅ Collaboration Features
- **Assignment System**: Assign tasks to team members
- **Comments**: Add comments with threading support
- **Activity Log**: Automatic tracking of all changes
- **Bulk Operations**: Select multiple tasks for bulk update/delete

### ✅ Time Management
- **Due Dates**: Set due dates with overdue indicators
- **Time Tracking**: Estimated vs actual hours
- **Reminders**: Set reminders (backend ready, frontend notification system needed)
- **Completion Tracking**: Automatic timestamp when marked complete

### ✅ Analytics Dashboard
- **Task Statistics**: Total, active, completed, overdue counts
- **Completion Rate**: Percentage of completed tasks
- **Status Distribution**: Visual breakdown by status
- **Performance Metrics**: Average completion time
- **Workload Indicators**: Alerts for high workload or overdue tasks

### ✅ Mobile Responsive
- All views are mobile-optimized
- Touch-friendly controls
- Responsive grid layouts
- Collapsible filters on mobile

## API Endpoints

All API endpoints are available through the Supabase client helpers in `/src/lib/supabase.ts`:

### Tasks API
```typescript
// Create a task
db.tasks.create(taskData)

// List tasks with filters
db.tasks.list(filters)

// Get single task
db.tasks.get(taskId)

// Update task
db.tasks.update(taskId, updates)

// Update task status
db.tasks.updateStatus(taskId, newStatus)

// Delete task
db.tasks.delete(taskId)

// Archive task
db.tasks.archive(taskId)

// Bulk operations
db.tasks.bulkUpdate(taskIds, updates)
db.tasks.bulkDelete(taskIds)

// Add comment
db.tasks.addComment(taskId, content)

// Get statistics
db.tasks.getStatistics(organizationId)

// Search tasks
db.tasks.search(searchTerm, filters)
```

### Categories API
```typescript
// Create category
db.taskCategories.create(categoryData)

// List categories
db.taskCategories.list(organizationId)

// Update category
db.taskCategories.update(categoryId, updates)

// Delete category
db.taskCategories.delete(categoryId)

// Assign categories to task
db.taskCategories.assignToTask(taskId, categoryIds)
```

## UI Components

### Main Components
1. **TaskCreateForm** (`/src/components/tasks/TaskCreateForm.tsx`)
   - Form with validation
   - Category selection
   - Assignee dropdown
   - Priority and status selection

2. **TaskListView** (`/src/components/tasks/TaskListView.tsx`)
   - List and board views
   - Filtering and sorting
   - Bulk selection
   - Search functionality

3. **TaskCard** (`/src/components/tasks/TaskCard.tsx`)
   - Compact task display
   - Quick status updates
   - Action menu

4. **TaskDetailView** (`/src/components/tasks/TaskDetailView.tsx`)
   - Full task details
   - Comments section
   - Activity log
   - Inline editing

5. **TaskAnalyticsDashboard** (`/src/components/tasks/TaskAnalyticsDashboard.tsx`)
   - Statistics cards
   - Status distribution chart
   - Performance metrics
   - Quick insights

## Pages

### Task Management Pages
- `/dashboard/tasks` - Main task list with analytics
- `/dashboard/tasks/[id]` - Individual task detail page
- `/dashboard/tasks/[id]/edit` - Task edit page (uses detail view in edit mode)

## Usage Examples

### Creating a Task
```typescript
import { db } from '@/lib/supabase'

const task = await db.tasks.create({
  title: 'Implement new feature',
  description: 'Add user authentication',
  priority: 'high',
  status: 'todo',
  assignee_id: 'user-uuid',
  due_date: '2024-12-31T23:59:59',
  estimated_hours: 8
})
```

### Filtering Tasks
```typescript
const tasks = await db.tasks.list({
  status: 'in_progress',
  priority: 'high',
  assignee_id: 'user-uuid',
  search: 'authentication',
  is_archived: false
})
```

### Adding a Comment
```typescript
await db.tasks.addComment(taskId, 'Great progress on this task!')
```

## Security

### Row Level Security (RLS)
All tables have RLS policies implemented:
- Users can only view tasks they created, are assigned to, or belong to their organization
- Users can only edit their own tasks or tasks in their organization
- Comments and activity logs are read-only
- Categories are organization-specific

### Permissions
- **Create**: Authenticated users can create tasks
- **Read**: Based on creator, assignee, or organization membership
- **Update**: Creator or organization member
- **Delete**: Creator only
- **Archive**: Creator or organization member

## Email Notifications (Setup Required)

The system is prepared for email notifications but requires additional setup:

1. Configure email provider in Supabase
2. Create email templates for:
   - Task assigned
   - Task status changed
   - Comment added
   - Task due soon
   - Task overdue

3. Implement webhook or cron job to process reminders:
```sql
-- Find and send pending reminders
SELECT * FROM task_reminders 
WHERE is_sent = FALSE 
AND remind_at <= NOW();
```

## Testing the System

1. **Create Test Data**:
   - Create several tasks with different statuses and priorities
   - Assign tasks to different users
   - Add comments and categories

2. **Test Features**:
   - Filter by different criteria
   - Switch between list and board views
   - Test bulk operations
   - Verify activity logging

3. **Test Permissions**:
   - Create tasks as different users
   - Verify visibility restrictions
   - Test edit permissions

## Future Enhancements

Potential improvements for the task management system:

1. **Recurring Tasks**: Support for repeating tasks
2. **Task Dependencies**: Link related tasks
3. **Custom Fields**: Allow organizations to add custom fields
4. **Task Templates**: Save and reuse common task structures
5. **Gantt Chart View**: Timeline visualization
6. **Time Tracking Integration**: Start/stop timers
7. **Slack/Discord Integration**: Notifications to external channels
8. **Advanced Reporting**: Detailed analytics and exports
9. **Task Automation**: Rules for automatic status updates
10. **Mobile App**: Native mobile application

## Troubleshooting

### Common Issues

1. **Tasks not showing**: Check RLS policies and user permissions
2. **Categories not saving**: Ensure organization_id is set
3. **Activity logs missing**: Verify trigger functions are created
4. **Statistics not updating**: Refresh the view or check view permissions

### Debug Queries

```sql
-- Check task count by status
SELECT status, COUNT(*) FROM tasks GROUP BY status;

-- View overdue tasks
SELECT * FROM tasks 
WHERE due_date < NOW() 
AND status NOT IN ('completed', 'cancelled');

-- Check user permissions
SELECT * FROM tasks 
WHERE creator_id = 'user-uuid' 
OR assignee_id = 'user-uuid';
```

## Support

For issues or questions about the task management system:
1. Check the error console for specific error messages
2. Verify database migrations were successful
3. Ensure all environment variables are set
4. Check Supabase logs for API errors