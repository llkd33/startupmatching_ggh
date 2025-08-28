-- Simple script to make a user admin
-- Replace the email with your actual admin email

-- Make user admin by email
UPDATE public.users 
SET 
  is_admin = TRUE,
  role = 'admin',
  updated_at = NOW()
WHERE email = 'admin@startupmatching.com';

-- Verify the admin was created
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE email = 'admin@startupmatching.com';

-- Check if is_admin column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Alternative: Make the first user in the database an admin
-- UPDATE public.users 
-- SET is_admin = TRUE 
-- WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1);

-- List all admin users
SELECT id, email, role, is_admin, created_at 
FROM public.users 
WHERE is_admin = TRUE;