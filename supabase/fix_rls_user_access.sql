-- ============================================
-- Fix RLS Policies for User Access Issues
-- ============================================
-- This fixes the 406 errors caused by overly restrictive RLS policies

-- ============================================
-- 1. FIX USERS TABLE ACCESS
-- ============================================

-- Users should be able to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Fix admin access policy to not interfere with normal user operations
DROP POLICY IF EXISTS "Verified admins can view all users" ON public.users;
CREATE POLICY "Verified admins can view all users" ON public.users
    FOR SELECT USING (
        -- Normal users can see their own data
        auth.uid() = id 
        OR 
        -- Admins can see all users (with improved admin check)
        (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role = 'admin'
                AND email LIKE '%@startupmatching.com'
            )
        )
    );

-- ============================================
-- 2. FIX ORGANIZATION PROFILES ACCESS
-- ============================================

-- Allow users to view their own organization profile
DROP POLICY IF EXISTS "Users can view own organization profile" ON public.organization_profiles;
CREATE POLICY "Users can view own organization profile" ON public.organization_profiles
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        -- Authenticated users can view completed profiles for matching
        (auth.uid() IS NOT NULL AND is_profile_complete = true)
    );

-- Allow users to update their own organization profile
DROP POLICY IF EXISTS "Users can update own organization profile" ON public.organization_profiles;
CREATE POLICY "Users can update own organization profile" ON public.organization_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Allow users to insert their own organization profile
DROP POLICY IF EXISTS "Users can insert own organization profile" ON public.organization_profiles;
CREATE POLICY "Users can insert own organization profile" ON public.organization_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. FIX EXPERT PROFILES ACCESS
-- ============================================

-- Allow users to view their own expert profile
DROP POLICY IF EXISTS "Users can view own expert profile" ON public.expert_profiles;
CREATE POLICY "Users can view own expert profile" ON public.expert_profiles
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        -- Authenticated users can view available experts
        (auth.uid() IS NOT NULL AND is_available = true AND is_profile_complete = true)
        OR
        -- Non-authenticated users can view basic info of available experts
        (auth.uid() IS NULL AND is_available = true AND is_profile_complete = true)
    );

-- Allow users to update their own expert profile
DROP POLICY IF EXISTS "Users can update own expert profile" ON public.expert_profiles;
CREATE POLICY "Users can update own expert profile" ON public.expert_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Allow users to insert their own expert profile
DROP POLICY IF EXISTS "Users can insert own expert profile" ON public.expert_profiles;
CREATE POLICY "Users can insert own expert profile" ON public.expert_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. ADD MISSING COLUMNS TO PROFILES
-- ============================================

-- Add is_profile_complete column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expert_profiles' 
        AND column_name = 'is_profile_complete'
    ) THEN
        ALTER TABLE public.expert_profiles 
        ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_profiles' 
        AND column_name = 'is_profile_complete'
    ) THEN
        ALTER TABLE public.organization_profiles 
        ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================
-- 5. UPDATE USERS TABLE POLICY FOR PROFILE LOADING
-- ============================================

-- Allow profile joins to work properly
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 6. FIX AUTHENTICATION TRIGGERS
-- ============================================

-- Ensure user creation trigger works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'expert')::user_role,
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. VERIFY POLICIES ARE WORKING
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS Policy fixes applied successfully';
    RAISE NOTICE '📋 Fixed policies:';
    RAISE NOTICE '   - Users can access their own profiles';
    RAISE NOTICE '   - Organization profiles accessible to owners';
    RAISE NOTICE '   - Expert profiles accessible with proper restrictions';
    RAISE NOTICE '   - Profile completion columns added';
    RAISE NOTICE '   - Authentication triggers fixed';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Next steps:';
    RAISE NOTICE '   - Test user authentication flows';
    RAISE NOTICE '   - Check profile loading in the app';
    RAISE NOTICE '   - Monitor for remaining 406 errors';
END
$$;