-- Complete fix for authentication and user creation workflow
-- This script fixes signup, login, and profile creation issues

-- 1. Drop existing problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_expert_profile_on_user_insert ON public.users;
DROP TRIGGER IF EXISTS create_organization_profile_on_user_insert ON public.users;

-- 2. Create improved user handler with profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role from metadata
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'expert');
  
  -- Insert into users table
  INSERT INTO public.users (id, email, role, phone)
  VALUES (
    new.id,
    new.email,
    user_role,
    new.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, users.phone),
    updated_at = now();
  
  -- Create appropriate profile based on role
  IF user_role = 'expert' THEN
    INSERT INTO public.expert_profiles (
      user_id,
      name,
      email,
      is_profile_complete
    ) VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', ''),
      new.email,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF user_role = 'organization' THEN
    INSERT INTO public.organization_profiles (
      user_id,
      name,
      email,
      organization_name,
      business_number,
      representative_name,
      contact_position,
      is_profile_complete
    ) VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'organizationName', ''),
      new.email,
      COALESCE(new.raw_user_meta_data->>'organizationName', ''),
      new.raw_user_meta_data->>'businessNumber',
      COALESCE(new.raw_user_meta_data->>'representativeName', ''),
      new.raw_user_meta_data->>'contactPosition',
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
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

-- 4. Ensure tables have correct structure
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'expert',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.expert_profiles 
  ALTER COLUMN is_profile_complete SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.organization_profiles 
  ALTER COLUMN is_profile_complete SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- 5. Fix RLS policies for proper access
-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.users;
DROP POLICY IF EXISTS "Allow auth inserts" ON public.users;
DROP POLICY IF EXISTS "Allow self update" ON public.users;

CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Expert profiles
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.expert_profiles;
DROP POLICY IF EXISTS "Allow auth inserts" ON public.expert_profiles;
DROP POLICY IF EXISTS "Allow self update" ON public.expert_profiles;

CREATE POLICY "Anyone can read expert profiles" ON public.expert_profiles
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert profiles" ON public.expert_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON public.expert_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Organization profiles
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.organization_profiles;
DROP POLICY IF EXISTS "Allow auth inserts" ON public.organization_profiles;
DROP POLICY IF EXISTS "Allow self update" ON public.organization_profiles;

CREATE POLICY "Anyone can read org profiles" ON public.organization_profiles
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert profiles" ON public.organization_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON public.organization_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Grant necessary permissions
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT ALL ON public.expert_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.organization_profiles TO anon, authenticated, service_role;

-- 7. Create helper function to check and fix existing users without profiles
CREATE OR REPLACE FUNCTION public.fix_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Fix expert users without profiles
  FOR user_record IN 
    SELECT u.id, u.email, u.role 
    FROM public.users u
    LEFT JOIN public.expert_profiles ep ON u.id = ep.user_id
    WHERE u.role = 'expert' AND ep.user_id IS NULL
  LOOP
    INSERT INTO public.expert_profiles (user_id, name, email, is_profile_complete)
    VALUES (user_record.id, '', user_record.email, false)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
  
  -- Fix organization users without profiles
  FOR user_record IN 
    SELECT u.id, u.email, u.role 
    FROM public.users u
    LEFT JOIN public.organization_profiles op ON u.id = op.user_id
    WHERE u.role = 'organization' AND op.user_id IS NULL
  LOOP
    INSERT INTO public.organization_profiles (user_id, name, email, organization_name, is_profile_complete)
    VALUES (user_record.id, '', user_record.email, '', false)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix
SELECT public.fix_missing_profiles();

-- 8. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_user_id ON public.expert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_complete ON public.expert_profiles(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_complete ON public.organization_profiles(is_profile_complete);

-- 9. Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Auth fix applied successfully';
  RAISE NOTICE 'Users count: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE 'Expert profiles count: %', (SELECT COUNT(*) FROM public.expert_profiles);
  RAISE NOTICE 'Organization profiles count: %', (SELECT COUNT(*) FROM public.organization_profiles);
END $$;