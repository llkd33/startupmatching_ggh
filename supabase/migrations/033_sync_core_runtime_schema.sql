-- Sync core runtime tables/functions required by the deployed app.
-- This migration is intentionally idempotent because older production databases
-- may contain only the auth/profile subset of the schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  CREATE TYPE public.campaign_type AS ENUM ('mentoring', 'investment', 'service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type public.campaign_type NOT NULL DEFAULT 'mentoring'::public.campaign_type,
  category TEXT,
  keywords TEXT[] DEFAULT '{}',
  budget_min NUMERIC(12, 2),
  budget_max NUMERIC(12, 2),
  start_date DATE,
  end_date DATE,
  location TEXT,
  required_experts INTEGER NOT NULL DEFAULT 1,
  attachments JSONB DEFAULT '[]'::jsonb,
  status public.campaign_status NOT NULL DEFAULT 'draft'::public.campaign_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ALTER COLUMN attachments SET DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.campaigns ALTER COLUMN required_experts SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_keywords ON public.campaigns USING GIN(keywords);

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  proposal_text TEXT NOT NULL,
  cover_letter TEXT,
  estimated_budget NUMERIC(12, 2),
  estimated_start_date DATE,
  estimated_end_date DATE,
  portfolio_links TEXT[] DEFAULT '{}',
  status public.proposal_status NOT NULL DEFAULT 'pending'::public.proposal_status,
  response_message TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, expert_id)
);

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_text TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(12, 2);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS estimated_start_date DATE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS estimated_end_date DATE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS portfolio_links TEXT[] DEFAULT '{}';
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS response_message TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_proposals_campaign_id ON public.proposals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_proposals_expert_id ON public.proposals(expert_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  content TEXT,
  related_id UUID,
  related_type TEXT,
  action_url TEXT,
  action_text TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_text TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_archived ON public.notifications(user_id, is_archived);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('campaign', 'expert', 'organization')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_visible" ON public.campaigns;
CREATE POLICY "campaigns_select_visible" ON public.campaigns
  FOR SELECT USING (
    status IN ('active'::public.campaign_status, 'in_progress'::public.campaign_status)
    OR EXISTS (
      SELECT 1
      FROM public.organization_profiles op
      WHERE op.id = campaigns.organization_id
        AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaigns_insert_own_org" ON public.campaigns;
CREATE POLICY "campaigns_insert_own_org" ON public.campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_profiles op
      WHERE op.id = campaigns.organization_id
        AND op.user_id = auth.uid()
        AND op.is_profile_complete = true
    )
  );

DROP POLICY IF EXISTS "campaigns_update_own_org" ON public.campaigns;
CREATE POLICY "campaigns_update_own_org" ON public.campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.organization_profiles op
      WHERE op.id = campaigns.organization_id
        AND op.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_profiles op
      WHERE op.id = campaigns.organization_id
        AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaigns_delete_own_org" ON public.campaigns;
CREATE POLICY "campaigns_delete_own_org" ON public.campaigns
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.organization_profiles op
      WHERE op.id = campaigns.organization_id
        AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proposals_select_related" ON public.proposals;
CREATE POLICY "proposals_select_related" ON public.proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expert_profiles ep
      WHERE ep.id = proposals.expert_id
        AND ep.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.organization_profiles op ON op.id = c.organization_id
      WHERE c.id = proposals.campaign_id
        AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proposals_insert_own_expert" ON public.proposals;
CREATE POLICY "proposals_insert_own_expert" ON public.proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expert_profiles ep
      WHERE ep.id = proposals.expert_id
        AND ep.user_id = auth.uid()
        AND ep.is_profile_complete = true
    )
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = proposals.campaign_id
        AND c.status = 'active'::public.campaign_status
    )
  );

DROP POLICY IF EXISTS "proposals_update_related" ON public.proposals;
CREATE POLICY "proposals_update_related" ON public.proposals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.expert_profiles ep
      WHERE ep.id = proposals.expert_id
        AND ep.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.organization_profiles op ON op.id = c.organization_id
      WHERE c.id = proposals.campaign_id
        AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_select_related" ON public.messages;
CREATE POLICY "messages_select_related" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "messages_insert_sender" ON public.messages;
CREATE POLICY "messages_insert_sender" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "messages_update_related" ON public.messages;
CREATE POLICY "messages_update_related" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete_sender" ON public.messages;
CREATE POLICY "messages_delete_sender" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "bookmarks_select_own" ON public.bookmarks;
CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "bookmarks_insert_own" ON public.bookmarks;
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "bookmarks_delete_own" ON public.bookmarks;
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notifications
  WHERE user_id = auth.uid()
    AND is_read = false
    AND is_archived = false;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true,
      read_at = COALESCE(read_at, NOW())
  WHERE id = notification_id
    AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true,
      read_at = COALESCE(read_at, NOW())
  WHERE user_id = auth.uid()
    AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_campaign_id UUID,
  p_proposal_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  IF p_sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'sender_id must match authenticated user';
  END IF;

  INSERT INTO public.messages (
    campaign_id,
    proposal_id,
    sender_id,
    receiver_id,
    content,
    message_type
  )
  VALUES (
    p_campaign_id,
    p_proposal_id,
    p_sender_id,
    p_receiver_id,
    p_content,
    COALESCE(NULLIF(p_message_type, ''), 'text')
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

DROP VIEW IF EXISTS public.campaign_list_view;
CREATE VIEW public.campaign_list_view AS
SELECT
  c.*,
  c.category AS category_slug,
  op.organization_name,
  op.industry AS organization_industry,
  op.is_verified AS organization_verified
FROM public.campaigns c
JOIN public.organization_profiles op ON op.id = c.organization_id;

DROP VIEW IF EXISTS public.message_thread_view;
CREATE VIEW public.message_thread_view AS
SELECT
  md5(CONCAT_WS(':', m.campaign_id::text, LEAST(m.sender_id, m.receiver_id)::text, GREATEST(m.sender_id, m.receiver_id)::text)) AS id,
  m.campaign_id,
  LEAST(m.sender_id, m.receiver_id) AS participant_1,
  GREATEST(m.sender_id, m.receiver_id) AS participant_2,
  p1.email AS participant_1_email,
  p2.email AS participant_2_email,
  ep1.name AS participant_1_name,
  ep2.name AS participant_2_name,
  op1.organization_name AS participant_1_org_name,
  op2.organization_name AS participant_2_org_name,
  c.title AS campaign_title,
  latest.content AS last_message_content,
  latest.created_at AS last_message_time,
  latest.created_at AS last_message_at,
  MIN(m.created_at) AS created_at
FROM public.messages m
JOIN public.users p1 ON p1.id = LEAST(m.sender_id, m.receiver_id)
JOIN public.users p2 ON p2.id = GREATEST(m.sender_id, m.receiver_id)
LEFT JOIN public.expert_profiles ep1 ON ep1.user_id = p1.id
LEFT JOIN public.expert_profiles ep2 ON ep2.user_id = p2.id
LEFT JOIN public.organization_profiles op1 ON op1.user_id = p1.id
LEFT JOIN public.organization_profiles op2 ON op2.user_id = p2.id
LEFT JOIN public.campaigns c ON c.id = m.campaign_id
JOIN LATERAL (
  SELECT m2.content, m2.created_at
  FROM public.messages m2
  WHERE COALESCE(m2.campaign_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(m.campaign_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND LEAST(m2.sender_id, m2.receiver_id) = LEAST(m.sender_id, m.receiver_id)
    AND GREATEST(m2.sender_id, m2.receiver_id) = GREATEST(m.sender_id, m.receiver_id)
  ORDER BY m2.created_at DESC
  LIMIT 1
) latest ON true
GROUP BY
  m.campaign_id,
  LEAST(m.sender_id, m.receiver_id),
  GREATEST(m.sender_id, m.receiver_id),
  p1.email,
  p2.email,
  ep1.name,
  ep2.name,
  op1.organization_name,
  op2.organization_name,
  c.title,
  latest.content,
  latest.created_at;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT ON public.campaign_list_view TO authenticated, anon;
GRANT SELECT ON public.message_thread_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
