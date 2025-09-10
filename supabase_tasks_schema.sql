-- Task Management Schema for Startup Matching Platform
-- This schema creates all necessary tables for a comprehensive task management system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Task status enum
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- Task priority enum  
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    
    -- User relationships
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Organization/Campaign relationships
    organization_id UUID REFERENCES organization_profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    expert_id UUID REFERENCES expert_profiles(id) ON DELETE CASCADE,
    
    -- Dates
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional fields
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    order_index INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Task categories/labels table
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    organization_id UUID REFERENCES organization_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, organization_id)
);

-- Many-to-many relationship for tasks and categories
CREATE TABLE IF NOT EXISTS task_category_relations (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    category_id UUID REFERENCES task_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, category_id)
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task activity log table
CREATE TABLE IF NOT EXISTS task_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, updated, status_changed, assigned, commented, etc.
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task reminders table
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_organization ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_remind_at ON task_reminders(remind_at) WHERE is_sent = FALSE;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON task_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO task_activity_logs (task_id, user_id, action, new_value, description)
        VALUES (NEW.id, NEW.creator_id, 'created', row_to_json(NEW), 'Task created');
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, description)
            VALUES (NEW.id, NEW.updated_by, 'status_changed', 
                    json_build_object('status', OLD.status), 
                    json_build_object('status', NEW.status),
                    'Status changed from ' || OLD.status || ' to ' || NEW.status);
        END IF;
        
        -- Log assignee changes
        IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
            INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, description)
            VALUES (NEW.id, NEW.updated_by, 'assigned',
                    json_build_object('assignee_id', OLD.assignee_id),
                    json_build_object('assignee_id', NEW.assignee_id),
                    'Assignee changed');
        END IF;
        
        -- Log priority changes
        IF OLD.priority != NEW.priority THEN
            INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, description)
            VALUES (NEW.id, NEW.updated_by, 'priority_changed',
                    json_build_object('priority', OLD.priority),
                    json_build_object('priority', NEW.priority),
                    'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: Activity logging trigger requires adding 'updated_by' column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Apply activity logging trigger
CREATE TRIGGER log_task_activity_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- View for task statistics
CREATE OR REPLACE VIEW task_statistics AS
SELECT 
    organization_id,
    COUNT(*) FILTER (WHERE status = 'todo') as todo_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_count,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue_count,
    COUNT(*) as total_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::DECIMAL(10,2) as avg_completion_hours
FROM tasks
WHERE is_archived = FALSE
GROUP BY organization_id;

-- View for user task assignments
CREATE OR REPLACE VIEW user_task_assignments AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    COUNT(t.id) FILTER (WHERE t.status = 'todo') as todo_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'completed' AND t.completed_at >= NOW() - INTERVAL '7 days') as completed_this_week,
    COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled')) as overdue_tasks
FROM users u
LEFT JOIN tasks t ON t.assignee_id = u.id AND t.is_archived = FALSE
GROUP BY u.id, u.email, u.role;

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_category_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view tasks they created or are assigned to" ON tasks
    FOR SELECT USING (
        auth.uid() = creator_id OR 
        auth.uid() = assignee_id OR
        organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid()) OR
        expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own tasks or assigned tasks" ON tasks
    FOR UPDATE USING (
        auth.uid() = creator_id OR 
        auth.uid() = assignee_id OR
        organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = creator_id);

-- Task categories policies
CREATE POLICY "Users can view categories" ON task_categories
    FOR SELECT USING (
        organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid()) OR
        organization_id IS NULL
    );

CREATE POLICY "Organization owners can manage categories" ON task_categories
    FOR ALL USING (
        organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid())
    );

-- Task comments policies
CREATE POLICY "Users can view comments on visible tasks" ON task_comments
    FOR SELECT USING (
        task_id IN (SELECT id FROM tasks WHERE 
            auth.uid() = creator_id OR 
            auth.uid() = assignee_id OR
            organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid()) OR
            expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can add comments to visible tasks" ON task_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        task_id IN (SELECT id FROM tasks WHERE 
            auth.uid() = creator_id OR 
            auth.uid() = assignee_id OR
            organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid()) OR
            expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own comments" ON task_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON task_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Activity logs are read-only
CREATE POLICY "Users can view activity logs for visible tasks" ON task_activity_logs
    FOR SELECT USING (
        task_id IN (SELECT id FROM tasks WHERE 
            auth.uid() = creator_id OR 
            auth.uid() = assignee_id OR
            organization_id IN (SELECT id FROM organization_profiles WHERE user_id = auth.uid()) OR
            expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
        )
    );

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;