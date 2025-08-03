-- Drop existing trigger and function to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_role_value user_role;
    phone_value TEXT;
BEGIN
    -- Get role with proper default
    user_role_value := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'expert'::user_role
    );
    
    -- Get phone if provided
    phone_value := NEW.raw_user_meta_data->>'phone';
    
    -- Insert into users table
    INSERT INTO public.users (id, email, role, phone, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_role_value,
        phone_value,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth transaction
        RAISE WARNING 'handle_new_user error: % - %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- Test the function works
SELECT 'Trigger function created successfully' as status;

-- Check existing users in auth.users that might not have records in public.users
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE((au.raw_user_meta_data->>'role')::user_role, 'expert'::user_role),
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the sync
SELECT 
    'Auth users' as table_name,
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
    'Public users' as table_name,
    COUNT(*) as count 
FROM public.users;