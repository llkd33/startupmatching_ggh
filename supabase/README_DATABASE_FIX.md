# Database Fix Instructions

## Issue
The application is showing a white screen because critical database functions are missing, causing JavaScript errors.

## Quick Fix Steps

### 1. Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `bgnuyghvjkqgwwvghqzo`
3. Navigate to **SQL Editor** in the left sidebar

### 2. Run the Database Fix
1. Click **New Query**
2. Copy and paste the entire content from `supabase/minimal_fix.sql`
3. Click **Run** button

### 3. Verify the Fix
After running the SQL, you should see:
```
Fix applied successfully! | notification_count: 0 | message_count: 0
```

## What This Fixes
- Creates missing `get_unread_notification_count()` function
- Creates missing `get_unread_message_count()` function  
- Adds proper RLS policies for messages table
- Grants necessary permissions

## Alternative: Manual Function Creation
If the full script fails, create these functions individually:

```sql
-- Function 1: Notification Count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.notifications
    WHERE user_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Message Count  
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    target_user_id UUID;
    unread_count INTEGER;
BEGIN
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*)::INTEGER
    INTO unread_count
    FROM public.messages
    WHERE receiver_id = target_user_id
    AND is_read = false;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
```

## After Fixing
1. Restart your development server: `npm run dev`
2. Visit http://localhost:3003
3. The page should now load properly with your beautiful UI

## If Still Having Issues
Check browser console (F12) for any remaining JavaScript errors and let me know what you see.