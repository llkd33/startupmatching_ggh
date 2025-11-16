-- Fix task_activity_logs RLS policy for trigger function
-- The log_task_activity() trigger function needs to insert into task_activity_logs
-- but RLS policies block INSERT operations. Make the function SECURITY DEFINER
-- so it can bypass RLS when inserting activity logs.

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO task_activity_logs (task_id, user_id, action, new_value, description)
        VALUES (NEW.id, NEW.creator_id, 'created', row_to_json(NEW), 'Task created');
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, description)
            VALUES (NEW.id, COALESCE(NEW.updated_by, NEW.creator_id), 'status_changed', 
                    json_build_object('status', OLD.status), 
                    json_build_object('status', NEW.status),
                    'Status changed from ' || OLD.status || ' to ' || NEW.status);
        END IF;
        
        -- Log assignee changes
        IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
            INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, description)
            VALUES (NEW.id, COALESCE(NEW.updated_by, NEW.creator_id), 'assigned',
                    json_build_object('assignee_id', OLD.assignee_id),
                    json_build_object('assignee_id', NEW.assignee_id),
                    'Assignee changed');
        END IF;
        
        -- Log priority changes
        IF OLD.priority != NEW.priority THEN
            INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, description)
            VALUES (NEW.id, COALESCE(NEW.updated_by, NEW.creator_id), 'priority_changed',
                    json_build_object('priority', OLD.priority),
                    json_build_object('priority', NEW.priority),
                    'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS log_task_activity_trigger ON tasks;
CREATE TRIGGER log_task_activity_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- Add comment explaining the function
COMMENT ON FUNCTION log_task_activity() IS 
  'Trigger function to log task activity. Uses SECURITY DEFINER to bypass RLS when inserting activity logs.';

DO $$ 
BEGIN
    RAISE NOTICE '✅ log_task_activity() function updated with SECURITY DEFINER to bypass RLS';
END $$;

