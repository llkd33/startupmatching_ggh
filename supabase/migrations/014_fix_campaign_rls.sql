-- Adjust campaign RLS policies to use organization profile ownership
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campaigns'
      AND policyname = 'Active campaigns are viewable by authenticated users'
  ) THEN
    DROP POLICY "Active campaigns are viewable by authenticated users" ON public.campaigns;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campaigns'
      AND policyname = 'Organizations can manage their own campaigns'
  ) THEN
    DROP POLICY "Organizations can manage their own campaigns" ON public.campaigns;
  END IF;
END $$;

-- Allow all authenticated users to see active campaigns, and allow owners to always see theirs
CREATE POLICY "Active campaigns are viewable by authenticated users" ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR organization_id IN (
      SELECT id FROM public.organization_profiles WHERE user_id = auth.uid()
    )
  );

-- Allow organizations to manage campaigns that belong to their organization profile
CREATE POLICY "Organizations can manage their own campaigns" ON public.campaigns
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organization_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organization_profiles WHERE user_id = auth.uid()
    )
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Campaign RLS policies updated to use organization profile ownership';
END $$;
