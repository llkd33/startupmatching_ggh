-- Ensure proposals table has estimated_budget column expected by the app
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'estimated_budget'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN estimated_budget INTEGER;
  END IF;
END
$$;

DO $$ BEGIN
  RAISE NOTICE '✅ proposals.estimated_budget column verified (created if missing)';
END $$;
