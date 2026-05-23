-- Make proposal INSERT RLS independent from RLS policies on related tables.
-- Older deployed clients may still insert directly into public.proposals, so
-- the policy should continue to work even when expert_profiles/campaigns RLS
-- policies are incomplete or temporarily missing.

CREATE OR REPLACE FUNCTION public.current_user_owns_expert_profile(p_expert_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.expert_profiles ep
    WHERE ep.id = p_expert_id
      AND ep.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND c.status::text = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_owns_expert_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_campaign(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owns_expert_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_campaign(uuid) TO authenticated;

DROP POLICY IF EXISTS "proposals_insert_own_expert" ON public.proposals;

CREATE POLICY "proposals_insert_own_expert"
  ON public.proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_owns_expert_profile(expert_id)
    AND public.is_active_campaign(campaign_id)
  );
