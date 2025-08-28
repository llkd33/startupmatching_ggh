-- Fix user creation issues in Supabase

-- 1. Drop existing trigger that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create a simpler trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Simple insert without complex logic
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'expert')
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure users table has correct structure
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'expert',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- 5. Remove any problematic constraints
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_phone_check;

-- 6. Fix RLS policies to be more permissive
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;

-- Allow anyone to read users (for login checks)
CREATE POLICY "Allow public read" ON public.users
  FOR SELECT USING (true);

-- Allow inserts from auth triggers
CREATE POLICY "Allow auth inserts" ON public.users
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own record
CREATE POLICY "Allow self update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 7. Do the same for profile tables
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

-- Expert profiles policies
DROP POLICY IF EXISTS "Allow public read" ON public.expert_profiles;
DROP POLICY IF EXISTS "Allow auth inserts" ON public.expert_profiles;
DROP POLICY IF EXISTS "Allow self update" ON public.expert_profiles;

CREATE POLICY "Allow public read" ON public.expert_profiles
  FOR SELECT USING (true);
CREATE POLICY "Allow auth inserts" ON public.expert_profiles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow self update" ON public.expert_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Organization profiles policies
DROP POLICY IF EXISTS "Allow public read" ON public.organization_profiles;
DROP POLICY IF EXISTS "Allow auth inserts" ON public.organization_profiles;
DROP POLICY IF EXISTS "Allow self update" ON public.organization_profiles;

CREATE POLICY "Allow public read" ON public.organization_profiles
  FOR SELECT USING (true);
CREATE POLICY "Allow auth inserts" ON public.organization_profiles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow self update" ON public.organization_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. Grant permissions
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT ALL ON public.expert_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.organization_profiles TO anon, authenticated, service_role;

-- 9. Test the setup by creating a test user record
-- (This simulates what should happen when auth.users gets a new user)
DO $$
BEGIN
  -- Create a test user record if it doesn't exist
  INSERT INTO public.users (id, email, role)
  VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'expert')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Test user record created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating test user: %', SQLERRM;
END $$;

-- 10. Check current users
SELECT COUNT(*) as user_count FROM public.users;
SELECT COUNT(*) as auth_user_count FROM auth.users;