-- Add estimated_start_date and estimated_end_date columns to proposals table
DO $$
BEGIN
  -- Add estimated_start_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'estimated_start_date'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN estimated_start_date DATE;
    
    RAISE NOTICE '✅ Added estimated_start_date column to proposals table';
  ELSE
    RAISE NOTICE 'ℹ️ estimated_start_date column already exists';
  END IF;

  -- Add estimated_end_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'estimated_end_date'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN estimated_end_date DATE;
    
    RAISE NOTICE '✅ Added estimated_end_date column to proposals table';
  ELSE
    RAISE NOTICE 'ℹ️ estimated_end_date column already exists';
  END IF;

  -- Add proposal_text column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'proposal_text'
  ) THEN
    -- Check if cover_letter exists and migrate data
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'proposals'
        AND column_name = 'cover_letter'
    ) THEN
      ALTER TABLE public.proposals
        ADD COLUMN proposal_text TEXT;
      
      UPDATE public.proposals
      SET proposal_text = cover_letter
      WHERE proposal_text IS NULL AND cover_letter IS NOT NULL;
      
      RAISE NOTICE '✅ Added proposal_text column and migrated data from cover_letter';
    ELSE
      ALTER TABLE public.proposals
        ADD COLUMN proposal_text TEXT NOT NULL DEFAULT '';
      
      RAISE NOTICE '✅ Added proposal_text column to proposals table';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ proposal_text column already exists';
  END IF;

  -- Add portfolio_links column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'portfolio_links'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN portfolio_links TEXT[] DEFAULT '{}';
    
    RAISE NOTICE '✅ Added portfolio_links column to proposals table';
  ELSE
    RAISE NOTICE 'ℹ️ portfolio_links column already exists';
  END IF;

  -- Add submitted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Set submitted_at to created_at for existing records
    UPDATE public.proposals
    SET submitted_at = created_at
    WHERE submitted_at IS NULL;
    
    RAISE NOTICE '✅ Added submitted_at column to proposals table';
  ELSE
    RAISE NOTICE 'ℹ️ submitted_at column already exists';
  END IF;

  -- Add reviewed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN reviewed_at TIMESTAMPTZ;
    
    RAISE NOTICE '✅ Added reviewed_at column to proposals table';
  ELSE
    RAISE NOTICE 'ℹ️ reviewed_at column already exists';
  END IF;

  -- Add response_message column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'response_message'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN response_message TEXT;
    
    RAISE NOTICE '✅ Added response_message column to proposals table';
  ELSE
    RAISE NOTICE 'ℹ️ response_message column already exists';
  END IF;
END
$$;

