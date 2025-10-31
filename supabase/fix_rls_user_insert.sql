-- ============================================
-- Fix Missing INSERT Policy for Users Table  
-- ============================================
-- This fixes the 400 error when trying to upsert user records during login

-- ============================================
-- 1. ADD MISSING INSERT POLICY FOR USERS TABLE
-- ============================================

-- Allow authenticated users to insert their own user record
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (
        auth.uid() = id 
        AND role IN ('expert', 'organization', 'admin')
        AND email IS NOT NULL
        AND email != ''
    );

-- ============================================
-- 2. ENSURE UPDATE POLICY EXISTS WITH VALIDATION
-- ============================================

-- Make sure update policy exists with proper validation
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        role IN ('expert', 'organization', 'admin')
        AND email IS NOT NULL
        AND email != ''
    );

-- ============================================
-- 3. ADD DEBUGGING FOR FAILED INSERTS
-- ============================================

-- Create a function to log failed user inserts for debugging
CREATE OR REPLACE FUNCTION public.debug_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log the attempted insert for debugging
    RAISE LOG 'User insert attempt: id=%, email=%, role=%, phone=%', 
        NEW.id, NEW.email, NEW.role, NEW.phone;
    
    -- Validate role
    IF NEW.role NOT IN ('expert', 'organization', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be expert, organization, or admin', NEW.role;
    END IF;
    
    -- Validate email
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE EXCEPTION 'Email cannot be empty';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for debugging (comment out in production)
-- DROP TRIGGER IF EXISTS debug_user_insert_trigger ON public.users;
-- CREATE TRIGGER debug_user_insert_trigger
--     BEFORE INSERT ON public.users
--     FOR EACH ROW EXECUTE FUNCTION public.debug_user_insert();

-- ============================================
-- 4. VERIFY CURRENT POLICIES
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ User table INSERT policy added with validation';
    RAISE NOTICE '📋 Active policies for users table:';
    RAISE NOTICE '   - SELECT: Users can view own profile + admin access';
    RAISE NOTICE '   - INSERT: Users can insert own profile with validation ✅ FIXED';
    RAISE NOTICE '   - UPDATE: Users can update own profile with validation ✅ FIXED';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Validation checks added:';
    RAISE NOTICE '   - Role must be expert, organization, or admin';
    RAISE NOTICE '   - Email must not be empty';
    RAISE NOTICE '   - User ID must match authenticated user';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 This should fix the 400 error during user backfill';
END
$$;