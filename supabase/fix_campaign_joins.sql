-- ============================================
-- Fix Campaign and Organization Profile Relationships
-- ============================================

-- First, check if organization_profiles table exists
DO $$
BEGIN
    -- Create organization_profiles table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_profiles'
    ) THEN
        CREATE TABLE public.organization_profiles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
            company_name TEXT,
            organization_name TEXT,
            representative_name TEXT,
            industry TEXT,
            logo_url TEXT,
            description TEXT,
            website TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Add missing columns to organization_profiles if they don't exist
DO $$
BEGIN
    -- Add company_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_profiles' 
        AND column_name = 'company_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.organization_profiles ADD COLUMN company_name TEXT;
    END IF;

    -- Add organization_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_profiles' 
        AND column_name = 'organization_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.organization_profiles ADD COLUMN organization_name TEXT;
    END IF;

    -- Add logo_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_profiles' 
        AND column_name = 'logo_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.organization_profiles ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- Fix campaigns table structure
DO $$
BEGIN
    -- Ensure organization_id exists and references users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'organization_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN organization_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create organization profiles for all organization users who don't have one
INSERT INTO public.organization_profiles (user_id, company_name, organization_name)
SELECT 
    u.id,
    COALESCE(u.email, 'Unknown Company'),
    COALESCE(u.email, 'Unknown Organization')
FROM public.users u
WHERE u.role = 'organization'
AND NOT EXISTS (
    SELECT 1 FROM public.organization_profiles op 
    WHERE op.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);

-- Enable RLS on organization_profiles
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization profiles are viewable by everyone" ON public.organization_profiles;
DROP POLICY IF EXISTS "Users can manage their own organization profile" ON public.organization_profiles;
DROP POLICY IF EXISTS "Authenticated users can view organization profiles" ON public.organization_profiles;

-- Create new policies for organization_profiles
CREATE POLICY "Authenticated users can view organization profiles" ON public.organization_profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage their own organization profile" ON public.organization_profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Test the fix
SELECT 
    'Campaign joins fixed successfully!' as status,
    COUNT(*) as organization_count
FROM public.organization_profiles;