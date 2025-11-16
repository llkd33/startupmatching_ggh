-- Fix cover_letter column in proposals table
-- This migration makes cover_letter nullable or removes it if proposal_text exists
-- This fixes "null value in column cover_letter violates not-null constraint" errors

DO $$
BEGIN
  -- Check if cover_letter column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'cover_letter'
  ) THEN
    -- Check if proposal_text column exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'proposals'
        AND column_name = 'proposal_text'
    ) THEN
      -- Migrate any remaining data from cover_letter to proposal_text
      UPDATE public.proposals
      SET proposal_text = cover_letter
      WHERE (proposal_text IS NULL OR proposal_text = '')
        AND cover_letter IS NOT NULL
        AND cover_letter != '';
      
      -- Make cover_letter nullable (since we're using proposal_text now)
      ALTER TABLE public.proposals
        ALTER COLUMN cover_letter DROP NOT NULL;
      
      -- Set default value for cover_letter to NULL for new inserts
      ALTER TABLE public.proposals
        ALTER COLUMN cover_letter SET DEFAULT NULL;
      
      RAISE NOTICE '✅ Made cover_letter nullable and migrated data to proposal_text';
    ELSE
      -- proposal_text doesn't exist, keep cover_letter as is
      RAISE NOTICE 'ℹ️ proposal_text column does not exist, keeping cover_letter';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ cover_letter column does not exist';
  END IF;
END
$$;

-- Add comment explaining the change
COMMENT ON COLUMN public.proposals.cover_letter IS 
  'Deprecated: Use proposal_text instead. This column is kept for backward compatibility but is nullable.';

