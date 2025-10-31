-- Ensure campaigns table has an attachments column for file metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaigns'
      AND column_name = 'attachments'
  ) THEN
    ALTER TABLE public.campaigns
      ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;
END
$$;

-- Backfill NULL attachments to an empty array for existing rows
UPDATE public.campaigns
SET attachments = '[]'::jsonb
WHERE attachments IS NULL;

ALTER TABLE public.campaigns
  ALTER COLUMN attachments SET DEFAULT '[]'::jsonb;

DO $$ BEGIN
  RAISE NOTICE '✅ campaign attachments column verified (created if missing)';
END $$;
