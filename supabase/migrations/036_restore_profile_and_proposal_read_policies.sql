-- Restore profile read policies needed by dashboard client queries, and make
-- proposal read/update policies independent from related-table RLS drift.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_owns_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.organization_profiles op ON op.id = c.organization_id
    WHERE c.id = p_campaign_id
      AND op.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_owns_campaign(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owns_campaign(uuid) TO authenticated;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "expert_profiles_select_authenticated" ON public.expert_profiles;
CREATE POLICY "expert_profiles_select_authenticated"
  ON public.expert_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "expert_profiles_insert_own" ON public.expert_profiles;
CREATE POLICY "expert_profiles_insert_own"
  ON public.expert_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "expert_profiles_update_own" ON public.expert_profiles;
CREATE POLICY "expert_profiles_update_own"
  ON public.expert_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "organization_profiles_select_authenticated" ON public.organization_profiles;
CREATE POLICY "organization_profiles_select_authenticated"
  ON public.organization_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "organization_profiles_insert_own" ON public.organization_profiles;
CREATE POLICY "organization_profiles_insert_own"
  ON public.organization_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "organization_profiles_update_own" ON public.organization_profiles;
CREATE POLICY "organization_profiles_update_own"
  ON public.organization_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "proposals_select_related" ON public.proposals;
CREATE POLICY "proposals_select_related"
  ON public.proposals
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_owns_expert_profile(expert_id)
    OR public.current_user_owns_campaign(campaign_id)
  );

DROP POLICY IF EXISTS "proposals_update_related" ON public.proposals;
CREATE POLICY "proposals_update_related"
  ON public.proposals
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_owns_expert_profile(expert_id)
    OR public.current_user_owns_campaign(campaign_id)
  )
  WITH CHECK (
    public.current_user_owns_expert_profile(expert_id)
    OR public.current_user_owns_campaign(campaign_id)
  );

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.expert_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_profiles TO authenticated;
GRANT SELECT, UPDATE ON public.proposals TO authenticated;
