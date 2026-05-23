-- Allow proposal creation for the signed-in owner of the expert profile.
-- The app verifies profile completeness before rendering the proposal form;
-- keeping that check out of RLS prevents stale profile-completeness flags from
-- blocking otherwise valid submissions.

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Experts can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_own_expert" ON public.proposals;

CREATE POLICY "proposals_insert_own_expert"
  ON public.proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.expert_profiles ep
      WHERE ep.id = proposals.expert_id
        AND ep.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = proposals.campaign_id
        AND c.status::text = 'active'
    )
  );

GRANT INSERT ON public.proposals TO authenticated;
