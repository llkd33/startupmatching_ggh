-- Fix authentication and user creation issues

-- 1. Ensure users table has proper structure
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Create or replace the auth trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, phone, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'expert'),
    new.raw_user_meta_data->>'phone',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, users.role),
    updated_at = now();
  
  -- Create profile based on role
  IF (new.raw_user_meta_data->>'role' = 'expert' OR 
      (new.raw_user_meta_data->>'role' IS NULL)) THEN
    INSERT INTO public.expert_profiles (user_id, created_at, updated_at)
    VALUES (new.id, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF new.raw_user_meta_data->>'role' = 'organization' THEN
    INSERT INTO public.organization_profiles (user_id, created_at, updated_at)
    VALUES (new.id, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable RLS but make it permissive for authenticated users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authentication" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on id" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.expert_profiles TO anon, authenticated;
GRANT ALL ON public.organization_profiles TO anon, authenticated;

-- 6. Create a test user manually (optional)
-- This will only work if run as service_role
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if test user already exists
  SELECT id INTO user_id FROM auth.users WHERE email = 'test@example.com';
  
  IF user_id IS NULL THEN
    -- Note: This requires service_role access
    -- You may need to create the user through Supabase dashboard instead
    RAISE NOTICE 'Please create test user through Supabase Auth dashboard';
  ELSE
    RAISE NOTICE 'Test user already exists with ID: %', user_id;
  END IF;
END $$;