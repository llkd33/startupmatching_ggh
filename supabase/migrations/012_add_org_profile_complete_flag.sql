-- Ensure organization_profiles has an is_profile_complete column used by the app
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_profiles'
      AND column_name = 'is_profile_complete'
  ) THEN
    ALTER TABLE public.organization_profiles
      ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- Normalize existing rows to have a non-null value
UPDATE public.organization_profiles
SET is_profile_complete = COALESCE(is_profile_complete, false);

ALTER TABLE public.organization_profiles
  ALTER COLUMN is_profile_complete SET DEFAULT false;

DO $$ BEGIN
  RAISE NOTICE '✅ organization_profiles.is_profile_complete column verified (created if missing)';
END $$;
