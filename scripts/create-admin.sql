-- Script to create initial admin user
-- Run this after creating the user through Supabase Auth Dashboard

-- 1. First, create a user in Supabase Dashboard Auth section with:
--    Email: admin@startupmatching.com
--    Password: Admin123!@# (change this immediately after first login)

-- 2. Then run this query to make them admin:

-- Find the user by email and make them admin
UPDATE profiles 
SET 
  is_admin = TRUE,
  role = 'admin',
  name = 'Super Admin',
  updated_at = NOW()
WHERE email = 'admin@startupmatching.com';

-- Verify the admin was created
SELECT id, email, name, role, is_admin, created_at 
FROM profiles 
WHERE email = 'admin@startupmatching.com';

-- Alternative: If you know the user ID, use this instead:
-- UPDATE profiles 
-- SET is_admin = TRUE 
-- WHERE id = 'YOUR-USER-UUID-HERE';

-- To create additional admin users:
-- 1. Create user in Supabase Auth
-- 2. Run: UPDATE profiles SET is_admin = TRUE WHERE email = 'new-admin@email.com';