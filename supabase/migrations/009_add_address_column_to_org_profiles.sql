-- Ensure organization_profiles has an address column for contact information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'organization_profiles'
      AND column_name  = 'address'
  ) THEN
    ALTER TABLE public.organization_profiles
      ADD COLUMN address TEXT;
  END IF;
END
$$;

DO $$ BEGIN
  RAISE NOTICE '✅ organization_profiles.address column verified (created if missing)';
END $$;
