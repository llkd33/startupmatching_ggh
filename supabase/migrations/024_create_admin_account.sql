-- Create admin account migration
-- This migration creates an admin user account
-- IMPORTANT: Change the password immediately after first login!

DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'admin@startupmatching.com';
  admin_password TEXT := 'Admin123!@#'; -- CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!
BEGIN
  -- Check if admin user already exists
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) THEN
    RAISE NOTICE 'Admin user already exists: %', admin_email;
    
    -- Update existing user to admin role
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
    
    -- Update users table
    UPDATE public.users
    SET 
      role = 'admin',
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    -- Add is_admin column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_admin'
    ) THEN
      ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Set is_admin flag
    UPDATE public.users
    SET is_admin = TRUE
    WHERE id = admin_user_id;
    
    RAISE NOTICE '✅ Updated existing user to admin: %', admin_email;
  ELSE
    RAISE NOTICE '⚠️  Admin user does not exist in auth.users';
    RAISE NOTICE 'Please create the user manually:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Click "Add user"';
    RAISE NOTICE '3. Email: %', admin_email;
    RAISE NOTICE '4. Password: %', admin_password;
    RAISE NOTICE '5. Then run this migration again to set admin role';
    
    -- Try to find user by email in users table (in case auth.users is out of sync)
    IF EXISTS (
      SELECT 1 FROM public.users WHERE email = admin_email
    ) THEN
      SELECT id INTO admin_user_id FROM public.users WHERE email = admin_email;
      
      -- Add is_admin column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'is_admin'
      ) THEN
        ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
      END IF;
      
      -- Set admin role
      UPDATE public.users
      SET 
        role = 'admin',
        is_admin = TRUE,
        updated_at = NOW()
      WHERE id = admin_user_id;
      
      RAISE NOTICE '✅ Set admin role for user: %', admin_email;
    END IF;
  END IF;
END
$$;

-- Verify admin was created
SELECT 
  id,
  email,
  role,
  is_admin,
  created_at
FROM public.users
WHERE email = 'admin@startupmatching.com' OR role = 'admin'
ORDER BY created_at DESC
LIMIT 5;

-- Add comment
COMMENT ON COLUMN public.users.is_admin IS 
  'Indicates if the user has admin privileges. Admins can access admin dashboard and manage all content.';

