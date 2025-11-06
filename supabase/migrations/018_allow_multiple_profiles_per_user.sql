-- Allow users to have both expert and organization profiles
-- This migration removes the UNIQUE constraint on user_id in both profile tables

-- Drop UNIQUE constraint on expert_profiles.user_id
ALTER TABLE public.expert_profiles 
DROP CONSTRAINT IF EXISTS expert_profiles_user_id_key;

-- Drop UNIQUE constraint on organization_profiles.user_id  
ALTER TABLE public.organization_profiles
DROP CONSTRAINT IF EXISTS organization_profiles_user_id_key;

-- Add index for better query performance (non-unique)
CREATE INDEX IF NOT EXISTS idx_expert_profiles_user_id ON public.expert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON public.organization_profiles(user_id);

-- Add comment explaining the change
COMMENT ON TABLE public.expert_profiles IS 'Expert profiles - users can now have multiple profiles (e.g., both expert and organization)';
COMMENT ON TABLE public.organization_profiles IS 'Organization profiles - users can now have multiple profiles (e.g., both expert and organization)';

