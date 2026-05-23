-- StartupMatching baseline schema for Supabase project barnxejaxhikqhhhdejg
-- Run this in Supabase SQL Editor on a fresh project.
-- This file consolidates the conflicting local migrations into one executable baseline.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('expert', 'organization', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role public.user_role,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expert_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  title TEXT,
  specialty TEXT,
  company TEXT,
  location TEXT,
  bio TEXT,
  career_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills TEXT[] NOT NULL DEFAULT '{}',
  expertise_areas TEXT[] NOT NULL DEFAULT '{}',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  service_regions TEXT[] NOT NULL DEFAULT '{}',
  portfolio_url TEXT,
  hourly_rate NUMERIC(12,2),
  is_available BOOLEAN NOT NULL DEFAULT true,
  availability_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  experience_years INTEGER NOT NULL DEFAULT 0,
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  profile_completeness INTEGER NOT NULL DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),
  response_time_hours INTEGER NOT NULL DEFAULT 24,
  completion_rate INTEGER NOT NULL DEFAULT 100 CHECK (completion_rate BETWEEN 0 AND 100),
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_projects INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL DEFAULT '',
  company_name TEXT,
  name TEXT,
  type TEXT,
  business_number TEXT,
  representative_name TEXT NOT NULL DEFAULT '',
  contact_position TEXT,
  industry TEXT,
  employee_count TEXT,
  website TEXT,
  description TEXT,
  address TEXT,
  logo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'mentoring'
    CHECK (type IN ('mentoring', 'investment', 'service', 'consulting', 'development', 'lecture_mentoring', 'service_outsourcing')),
  category TEXT,
  industry TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  budget NUMERIC(14,2),
  budget_min NUMERIC(14,2),
  budget_max NUMERIC(14,2),
  start_date DATE,
  end_date DATE,
  deadline DATE,
  location TEXT,
  required_experts INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled')),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  campaign_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  proposal_text TEXT NOT NULL DEFAULT '',
  cover_letter TEXT NOT NULL DEFAULT '',
  estimated_budget NUMERIC(14,2),
  proposed_budget NUMERIC(14,2),
  proposed_timeline TEXT,
  estimated_start_date DATE,
  estimated_end_date DATE,
  portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  response_message TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, expert_id)
);

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  project_type TEXT NOT NULL,
  expected_budget TEXT,
  expected_duration TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  shared_contact_info JSONB,
  expert_response TEXT,
  expert_responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system'
    CHECK (type IN (
      'connection_request',
      'connection_approved',
      'connection_rejected',
      'campaign_match',
      'proposal_received',
      'proposal_accepted',
      'proposal_rejected',
      'message',
      'profile_update',
      'system'
    )),
  title TEXT NOT NULL,
  content TEXT,
  message TEXT,
  related_id UUID,
  related_type TEXT,
  action_url TEXT,
  action_text TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
  participant_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT message_threads_distinct_participants CHECK (participant_1 <> participant_2),
  UNIQUE (campaign_id, participant_1, participant_2)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.message_threads(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('expert', 'organization', 'admin')),
  organization_name TEXT,
  position TEXT,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  expert_id UUID REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC(5,2),
  actual_hours NUMERIC(5,2),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  organization_id UUID REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, organization_id)
);

CREATE TABLE IF NOT EXISTS public.task_category_relations (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.task_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  connection_request_email BOOLEAN NOT NULL DEFAULT true,
  request_approved_email BOOLEAN NOT NULL DEFAULT true,
  request_rejected_email BOOLEAN NOT NULL DEFAULT true,
  new_proposal_email BOOLEAN NOT NULL DEFAULT true,
  proposal_accepted_email BOOLEAN NOT NULL DEFAULT true,
  proposal_rejected_email BOOLEAN NOT NULL DEFAULT true,
  new_message_email BOOLEAN NOT NULL DEFAULT true,
  campaign_deadline_email BOOLEAN NOT NULL DEFAULT true,
  campaign_status_email BOOLEAN NOT NULL DEFAULT true,
  task_assigned_email BOOLEAN NOT NULL DEFAULT true,
  task_deadline_email BOOLEAN NOT NULL DEFAULT true,
  marketing_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('campaign', 'expert', 'organization')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  search_query TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  results_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matching_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organization_profiles(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  expert_id UUID REFERENCES public.expert_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'contact', 'shortlist')),
  match_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  error_type TEXT NOT NULL DEFAULT 'unknown',
  error_code TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  user_agent TEXT,
  url TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, action_type, window_start)
);

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_expert_profiles_user_id ON public.expert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_skills ON public.expert_profiles USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_expertise_areas ON public.expert_profiles USING gin(expertise_areas);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_hashtags ON public.expert_profiles USING gin(hashtags);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_regions ON public.expert_profiles USING gin(service_regions);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_location ON public.expert_profiles(location);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_availability ON public.expert_profiles(availability_status, is_available);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON public.campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_keywords ON public.campaigns USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_campaigns_required_skills ON public.campaigns USING gin(required_skills);
CREATE INDEX IF NOT EXISTS idx_proposals_campaign_id ON public.proposals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_proposals_expert_id ON public.proposals(expert_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_expert_id ON public.connection_requests(expert_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_organization_id ON public.connection_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON public.connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON public.message_threads(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_message_threads_campaign ON public.message_threads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON public.messages(proposal_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages(receiver_id, is_read) WHERE is_read = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_organization ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON public.tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_remind_at ON public.task_reminders(remind_at) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id, target_type);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_logs_campaign ON public.matching_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(user_id, action_type, window_start);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_user_id
      AND (is_admin = true OR role = 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF NEW.raw_user_meta_data ? 'role'
     AND NEW.raw_user_meta_data->>'role' IN ('expert', 'organization', 'admin') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  ELSE
    v_role := 'expert'::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, role, phone)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_role, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = COALESCE(public.users.role, EXCLUDED.role),
      phone = COALESCE(public.users.phone, EXCLUDED.phone),
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(p_expert_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  completeness INTEGER := 0;
  profile RECORD;
BEGIN
  SELECT * INTO profile FROM public.expert_profiles WHERE id = p_expert_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF COALESCE(profile.name, '') <> '' THEN completeness := completeness + 10; END IF;
  IF COALESCE(profile.title, '') <> '' THEN completeness := completeness + 10; END IF;
  IF profile.bio IS NOT NULL AND length(profile.bio) > 50 THEN completeness := completeness + 10; END IF;
  IF COALESCE(profile.location, '') <> '' THEN completeness := completeness + 10; END IF;
  IF profile.career_history IS NOT NULL AND jsonb_typeof(profile.career_history) = 'array' AND jsonb_array_length(profile.career_history) > 0 THEN completeness := completeness + 15; END IF;
  IF profile.education IS NOT NULL AND jsonb_typeof(profile.education) = 'array' AND jsonb_array_length(profile.education) > 0 THEN completeness := completeness + 15; END IF;
  IF array_length(profile.skills, 1) >= 3 THEN completeness := completeness + 10; END IF;
  IF array_length(profile.hashtags, 1) >= 3 THEN completeness := completeness + 10; END IF;
  IF profile.hourly_rate IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF COALESCE(profile.portfolio_url, '') <> '' THEN completeness := completeness + 5; END IF;

  RETURN LEAST(completeness, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expert_profile_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  completeness INTEGER := 0;
BEGIN
  IF COALESCE(NEW.name, '') <> '' THEN completeness := completeness + 10; END IF;
  IF COALESCE(NEW.title, '') <> '' THEN completeness := completeness + 10; END IF;
  IF NEW.bio IS NOT NULL AND length(NEW.bio) > 50 THEN completeness := completeness + 10; END IF;
  IF COALESCE(NEW.location, '') <> '' THEN completeness := completeness + 10; END IF;
  IF NEW.career_history IS NOT NULL AND jsonb_typeof(NEW.career_history) = 'array' AND jsonb_array_length(NEW.career_history) > 0 THEN completeness := completeness + 15; END IF;
  IF NEW.education IS NOT NULL AND jsonb_typeof(NEW.education) = 'array' AND jsonb_array_length(NEW.education) > 0 THEN completeness := completeness + 15; END IF;
  IF array_length(NEW.skills, 1) >= 3 THEN completeness := completeness + 10; END IF;
  IF array_length(NEW.hashtags, 1) >= 3 THEN completeness := completeness + 10; END IF;
  IF NEW.hourly_rate IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF COALESCE(NEW.portfolio_url, '') <> '' THEN completeness := completeness + 5; END IF;

  NEW.profile_completeness := LEAST(completeness, 100);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_notification_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.message := COALESCE(NEW.message, NEW.content, '');
  NEW.content := COALESCE(NEW.content, NEW.message, '');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  actor_id := COALESCE(NEW.updated_by, NEW.creator_id, auth.uid());

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity_logs (task_id, user_id, action, new_value, description)
    VALUES (NEW.id, actor_id, 'created', to_jsonb(NEW), 'Task created');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.task_activity_logs (task_id, user_id, action, old_value, new_value, description)
      VALUES (
        NEW.id,
        actor_id,
        'status_changed',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        'Status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;

    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO public.task_activity_logs (task_id, user_id, action, old_value, new_value, description)
      VALUES (
        NEW.id,
        actor_id,
        'assigned',
        jsonb_build_object('assignee_id', OLD.assignee_id),
        jsonb_build_object('assignee_id', NEW.assignee_id),
        'Assignee changed'
      );
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.task_activity_logs (task_id, user_id, action, old_value, new_value, description)
      VALUES (
        NEW.id,
        actor_id,
        'priority_changed',
        jsonb_build_object('priority', OLD.priority),
        jsonb_build_object('priority', NEW.priority),
        'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expert_profiles_updated_at ON public.expert_profiles;
CREATE TRIGGER update_expert_profiles_updated_at BEFORE UPDATE ON public.expert_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_expert_profile_completeness_trigger ON public.expert_profiles;
CREATE TRIGGER set_expert_profile_completeness_trigger BEFORE INSERT OR UPDATE ON public.expert_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_expert_profile_completeness();

DROP TRIGGER IF EXISTS update_organization_profiles_updated_at ON public.organization_profiles;
CREATE TRIGGER update_organization_profiles_updated_at BEFORE UPDATE ON public.organization_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_connection_requests_updated_at ON public.connection_requests;
CREATE TRIGGER update_connection_requests_updated_at BEFORE UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS sync_notification_content_trigger ON public.notifications;
CREATE TRIGGER sync_notification_content_trigger BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_notification_content();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON public.user_invitations;
CREATE TRIGGER update_user_invitations_updated_at BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS log_task_activity_trigger ON public.tasks;
CREATE TRIGGER log_task_activity_trigger AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

DROP TRIGGER IF EXISTS update_task_categories_updated_at ON public.task_categories;
CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON public.task_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON public.user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = auth.uid()
      AND is_read = false
      AND is_archived = false
      AND deleted_at IS NULL
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() <> user_uuid AND NOT public.is_admin(auth.uid())) THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = user_uuid
      AND is_read = false
      AND is_archived = false
      AND deleted_at IS NULL
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true,
      read_at = COALESCE(read_at, now())
  WHERE id = notification_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true,
      read_at = COALESCE(read_at, now())
  WHERE user_id = auth.uid()
    AND is_read = false
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.messages
    WHERE receiver_id = auth.uid()
      AND is_read = false
      AND deleted_at IS NULL
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() <> user_uuid AND NOT public.is_admin(auth.uid())) THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.messages
    WHERE receiver_id = user_uuid
      AND is_read = false
      AND deleted_at IS NULL
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_participant(
  p_campaign_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_campaign_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid())) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.organization_profiles op ON op.id = c.organization_id
    WHERE c.id = p_campaign_id
      AND op.user_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.proposals p
    JOIN public.expert_profiles ep ON ep.id = p.expert_id
    WHERE p.campaign_id = p_campaign_id
      AND ep.user_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.campaign_id = p_campaign_id
      AND (m.sender_id = p_user_id OR m.receiver_id = p_user_id)
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.message_threads mt
    WHERE mt.campaign_id = p_campaign_id
      AND (mt.participant_1 = p_user_id OR mt.participant_2 = p_user_id)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_send_message(
  p_campaign_id UUID,
  p_proposal_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> p_sender_id
     OR p_sender_id IS NULL
     OR p_receiver_id IS NULL
     OR p_sender_id = p_receiver_id THEN
    RETURN false;
  END IF;

  IF p_proposal_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.proposals p
    JOIN public.expert_profiles ep ON ep.id = p.expert_id
    JOIN public.campaigns c ON c.id = p.campaign_id
    JOIN public.organization_profiles op ON op.id = c.organization_id
    WHERE p.id = p_proposal_id
      AND (p_campaign_id IS NULL OR p.campaign_id = p_campaign_id)
      AND (
        (ep.user_id = p_sender_id AND op.user_id = p_receiver_id)
        OR (op.user_id = p_sender_id AND ep.user_id = p_receiver_id)
      )
  ) THEN
    RETURN true;
  END IF;

  IF p_campaign_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.proposals p
    JOIN public.expert_profiles ep ON ep.id = p.expert_id
    JOIN public.campaigns c ON c.id = p.campaign_id
    JOIN public.organization_profiles op ON op.id = c.organization_id
    WHERE c.id = p_campaign_id
      AND (
        (ep.user_id = p_sender_id AND op.user_id = p_receiver_id)
        OR (op.user_id = p_sender_id AND ep.user_id = p_receiver_id)
      )
  ) THEN
    RETURN true;
  END IF;

  IF p_campaign_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.campaign_id = p_campaign_id
      AND (
        (m.sender_id = p_sender_id AND m.receiver_id = p_receiver_id)
        OR (m.sender_id = p_receiver_id AND m.receiver_id = p_sender_id)
      )
  ) THEN
    RETURN true;
  END IF;

  IF p_campaign_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.message_threads mt
    WHERE mt.campaign_id = p_campaign_id
      AND (
        (mt.participant_1 = LEAST(p_sender_id, p_receiver_id)
         AND mt.participant_2 = GREATEST(p_sender_id, p_receiver_id))
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_message_thread(
  p_campaign_id UUID,
  p_participant_1 UUID,
  p_participant_2 UUID,
  p_proposal_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_id UUID;
  normalized_1 UUID;
  normalized_2 UUID;
BEGIN
  IF NOT public.can_send_message(p_campaign_id, p_proposal_id, p_participant_1, p_participant_2) THEN
    RAISE EXCEPTION 'message participants are not allowed for this campaign';
  END IF;

  normalized_1 := LEAST(p_participant_1, p_participant_2);
  normalized_2 := GREATEST(p_participant_1, p_participant_2);

  SELECT id INTO thread_id
  FROM public.message_threads
  WHERE campaign_id IS NOT DISTINCT FROM p_campaign_id
    AND participant_1 = normalized_1
    AND participant_2 = normalized_2
  LIMIT 1;

  IF thread_id IS NULL THEN
    INSERT INTO public.message_threads (campaign_id, proposal_id, participant_1, participant_2)
    VALUES (p_campaign_id, p_proposal_id, normalized_1, normalized_2)
    RETURNING id INTO thread_id;
  END IF;

  RETURN thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_campaign_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT,
  p_proposal_id UUID DEFAULT NULL,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_id UUID;
  thread_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RAISE EXCEPTION 'sender_id must match the authenticated user';
  END IF;

  IF NOT public.can_send_message(p_campaign_id, p_proposal_id, p_sender_id, p_receiver_id) THEN
    RAISE EXCEPTION 'sender and receiver are not allowed to message for this campaign';
  END IF;

  SELECT public.create_message_thread(p_campaign_id, p_sender_id, p_receiver_id, p_proposal_id)
  INTO thread_id;

  INSERT INTO public.messages (
    campaign_id,
    proposal_id,
    thread_id,
    sender_id,
    receiver_id,
    content,
    message_type
  )
  VALUES (
    p_campaign_id,
    p_proposal_id,
    thread_id,
    p_sender_id,
    p_receiver_id,
    p_content,
    COALESCE(p_message_type, 'text')
  )
  RETURNING id INTO message_id;

  UPDATE public.message_threads
  SET last_message_at = now()
  WHERE id = thread_id;

  RETURN message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  p_campaign_id UUID,
  p_sender_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE public.messages
    SET is_read = true,
        read_at = COALESCE(read_at, now())
    WHERE campaign_id = p_campaign_id
      AND receiver_id = auth.uid()
      AND is_read = false
      AND deleted_at IS NULL
      AND (p_sender_id IS NULL OR sender_id = p_sender_id)
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO updated_count FROM updated;

  RETURN COALESCE(updated_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_message_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_message_ids IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE public.messages
    SET is_read = true,
        read_at = COALESCE(read_at, now())
    WHERE id = ANY(p_message_ids)
      AND receiver_id = auth.uid()
      AND is_read = false
      AND deleted_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO updated_count FROM updated;

  RETURN COALESCE(updated_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expert_hashtags(p_expert_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  jwt_role := COALESCE(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '');

  UPDATE public.expert_profiles
  SET hashtags = CASE
        WHEN array_length(hashtags, 1) IS NULL OR array_length(hashtags, 1) = 0 THEN skills
        ELSE hashtags
      END,
      expertise_areas = CASE
        WHEN array_length(expertise_areas, 1) IS NULL OR array_length(expertise_areas, 1) = 0 THEN skills
        ELSE expertise_areas
      END,
      updated_at = now()
  WHERE id = p_expert_id
    AND (jwt_role = 'service_role' OR user_id = auth.uid() OR public.is_admin(auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION public.match_campaign_experts(
  p_campaign_id UUID,
  p_stage INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  expert_id UUID,
  user_id UUID,
  name TEXT,
  skills TEXT[],
  hashtags TEXT[],
  bio TEXT,
  hourly_rate NUMERIC,
  rating NUMERIC,
  total_projects INTEGER,
  match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = p_campaign_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH campaign AS (
    SELECT
      c.keywords,
      c.required_skills,
      c.location,
      c.budget_min,
      c.budget_max
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
  ),
  scored AS (
    SELECT
      ep.id AS expert_id,
      ep.user_id,
      ep.name,
      ep.skills,
      ep.hashtags,
      ep.bio,
      ep.hourly_rate,
      ep.rating,
      ep.total_projects,
      LEAST(100, GREATEST(0,
        30
        + CASE
            WHEN (SELECT array_length(keywords || required_skills, 1) FROM campaign) IS NULL THEN 15
            ELSE COALESCE((
              SELECT COUNT(*) * 12
              FROM unnest((SELECT keywords || required_skills FROM campaign)) AS kw(term)
              WHERE lower(kw.term) = ANY (
                SELECT lower(expert_term.term)
                FROM unnest(ep.skills || ep.hashtags || ep.expertise_areas) AS expert_term(term)
              )
            ), 0)
          END
        + CASE
            WHEN (SELECT location FROM campaign) IS NULL OR (SELECT location FROM campaign) = '' THEN 15
            WHEN ep.location ILIKE '%' || (SELECT location FROM campaign) || '%' THEN 20
            WHEN (SELECT location FROM campaign) = ANY(ep.service_regions) OR '전국' = ANY(ep.service_regions) OR '원격' = ANY(ep.service_regions) THEN 15
            ELSE 0
          END
        + CASE
            WHEN ep.is_available THEN 15 ELSE 0
          END
        + LEAST(15, ep.experience_years)
        + LEAST(10, COALESCE(ep.rating_average, ep.rating, 0)::INTEGER * 2)
      ))::INTEGER AS match_score
    FROM public.expert_profiles ep
    WHERE ep.is_available = true
  )
  SELECT
    s.expert_id,
    s.user_id,
    s.name,
    s.skills,
    s.hashtags,
    s.bio,
    s.hourly_rate,
    s.rating,
    s.total_projects,
    s.match_score
  FROM scored s
  ORDER BY s.match_score DESC, s.rating DESC, s.total_projects DESC
  LIMIT COALESCE(p_limit, 20);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_notification_preference(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_enabled BOOLEAN;
  v_specific_enabled BOOLEAN;
BEGIN
  SELECT
    email_notifications,
    CASE p_notification_type
      WHEN 'connection_request' THEN connection_request_email
      WHEN 'request_approved' THEN request_approved_email
      WHEN 'request_rejected' THEN request_rejected_email
      WHEN 'new_proposal' THEN new_proposal_email
      WHEN 'proposal_accepted' THEN proposal_accepted_email
      WHEN 'proposal_rejected' THEN proposal_rejected_email
      WHEN 'new_message' THEN new_message_email
      WHEN 'campaign_deadline' THEN campaign_deadline_email
      WHEN 'campaign_status' THEN campaign_status_email
      WHEN 'task_assigned' THEN task_assigned_email
      WHEN 'task_deadline' THEN task_deadline_email
      WHEN 'marketing' THEN marketing_email
      ELSE true
    END
  INTO v_email_enabled, v_specific_enabled
  FROM public.user_notification_settings
  WHERE user_id = p_user_id;

  IF v_email_enabled IS NULL THEN
    RETURN p_notification_type <> 'marketing';
  END IF;

  RETURN v_email_enabled AND COALESCE(v_specific_enabled, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT COALESCE(SUM(request_count), 0)::INTEGER INTO v_count
  FROM public.rate_limits
  WHERE user_id = v_user_id
    AND action_type = p_action_type
    AND window_start > now() - interval '1 minute';

  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (user_id, action_type, request_count)
  VALUES (v_user_id, p_action_type, 1)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  role TEXT,
  organization_name TEXT,
  position TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ui.id,
    ui.email,
    ui.name,
    ui.phone,
    ui.role,
    ui.organization_name,
    ui.position,
    ui.status,
    ui.expires_at,
    ui.accepted_at
  FROM public.user_invitations ui
  WHERE ui.token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.storage_path_campaign_id(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SET search_path = public, storage
AS $$
DECLARE
  parts TEXT[];
  candidate TEXT;
BEGIN
  parts := storage.foldername(p_name);
  candidate := CASE
    WHEN parts[1] = 'messages' THEN parts[2]
    ELSE parts[1]
  END;

  IF candidate IS NULL
     OR candidate !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN candidate::UUID;
END;
$$;

DROP VIEW IF EXISTS public.message_thread_view;
CREATE VIEW public.message_thread_view AS
SELECT
  mt.id,
  mt.campaign_id,
  mt.proposal_id,
  mt.participant_1,
  mt.participant_2,
  mt.last_message_at,
  mt.created_at,
  u1.email AS participant_1_email,
  u2.email AS participant_2_email,
  ep1.name AS participant_1_name,
  ep2.name AS participant_2_name,
  op1.organization_name AS participant_1_org_name,
  op2.organization_name AS participant_2_org_name,
  c.title AS campaign_title,
  last_msg.content AS last_message_content,
  last_msg.created_at AS last_message_time,
  0 AS unread_count
FROM public.message_threads mt
JOIN public.users u1 ON mt.participant_1 = u1.id
JOIN public.users u2 ON mt.participant_2 = u2.id
LEFT JOIN public.expert_profiles ep1 ON u1.id = ep1.user_id
LEFT JOIN public.expert_profiles ep2 ON u2.id = ep2.user_id
LEFT JOIN public.organization_profiles op1 ON u1.id = op1.user_id
LEFT JOIN public.organization_profiles op2 ON u2.id = op2.user_id
LEFT JOIN public.campaigns c ON mt.campaign_id = c.id
LEFT JOIN LATERAL (
  SELECT m.content, m.created_at
  FROM public.messages m
  WHERE m.thread_id = mt.id
     OR (
       m.campaign_id IS NOT DISTINCT FROM mt.campaign_id
       AND (
         (m.sender_id = mt.participant_1 AND m.receiver_id = mt.participant_2)
         OR (m.sender_id = mt.participant_2 AND m.receiver_id = mt.participant_1)
       )
     )
	  ORDER BY m.created_at DESC
	  LIMIT 1
) last_msg ON true
WHERE mt.participant_1 = auth.uid()
   OR mt.participant_2 = auth.uid()
   OR public.is_admin(auth.uid());

DROP VIEW IF EXISTS public.expert_search_view;
CREATE VIEW public.expert_search_view AS
SELECT
  ep.id,
  ep.user_id,
  ep.name,
  ep.title,
  ep.specialty,
  ep.company,
  ep.location,
  ep.bio,
  ep.career_history,
  ep.education,
  ep.skills,
  ep.expertise_areas,
  ep.hashtags,
  ep.service_regions,
  ep.portfolio_url,
  ep.hourly_rate,
  ep.is_available,
  ep.availability_status,
  ep.experience_years,
  ep.is_profile_complete,
  ep.profile_completeness,
  ep.response_time_hours,
  ep.completion_rate,
  ep.created_at,
  ep.updated_at,
  COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.connection_requests cr
    WHERE cr.expert_id = ep.id
      AND cr.status = 'approved'
  ), 0) AS completed_projects,
  COALESCE(ep.rating_average, ep.rating, 0) AS rating_average,
  COALESCE(ep.total_reviews, 0) AS total_reviews
FROM public.expert_profiles ep
WHERE ep.is_available = true;

DROP VIEW IF EXISTS public.campaign_list_view;
CREATE VIEW public.campaign_list_view AS
SELECT
  c.*,
  cat.name AS category_name,
  cat.slug AS category_slug,
  op.organization_name,
  op.company_name,
  op.industry AS organization_industry,
  op.is_verified AS organization_is_verified,
  COALESCE(proposal_stats.proposals_count, 0) AS proposals_count,
  COALESCE(proposal_stats.accepted_proposals_count, 0) AS accepted_proposals_count
FROM public.campaigns c
LEFT JOIN public.categories cat ON c.category_id = cat.id
LEFT JOIN public.organization_profiles op ON c.organization_id = op.id
LEFT JOIN (
  SELECT
    campaign_id,
    COUNT(*)::INTEGER AS proposals_count,
    COUNT(*) FILTER (WHERE status = 'accepted')::INTEGER AS accepted_proposals_count
  FROM public.proposals
  GROUP BY campaign_id
) proposal_stats ON c.id = proposal_stats.campaign_id
WHERE c.status IN ('active', 'in_progress', 'completed')
   OR public.is_admin(auth.uid())
   OR c.organization_id IN (
     SELECT id FROM public.organization_profiles WHERE user_id = auth.uid()
   );

DROP VIEW IF EXISTS public.user_profiles;
CREATE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.role,
  u.phone,
  u.is_admin,
  u.status,
  u.created_at,
  u.updated_at,
  COALESCE(ep.name, op.representative_name, op.organization_name) AS name,
  op.organization_name,
  ep.skills,
  ep.is_available,
  op.is_verified,
  ep.bio,
  op.description
FROM public.users u
LEFT JOIN public.expert_profiles ep ON u.id = ep.user_id
LEFT JOIN public.organization_profiles op ON u.id = op.user_id
WHERE u.id = auth.uid()
   OR public.is_admin(auth.uid());

DROP VIEW IF EXISTS public.admin_statistics;
CREATE VIEW public.admin_statistics AS
SELECT
  (SELECT COUNT(*) FROM public.users WHERE role = 'expert') AS total_experts,
  (SELECT COUNT(*) FROM public.users WHERE role = 'organization') AS total_organizations,
  (SELECT COUNT(*) FROM public.users WHERE is_admin = true OR role = 'admin') AS total_admins,
  (SELECT COUNT(*) FROM public.campaigns) AS total_campaigns,
  (SELECT COUNT(*) FROM public.campaigns WHERE status = 'active') AS active_campaigns,
  (SELECT COUNT(*) FROM public.proposals) AS total_proposals,
  (SELECT COUNT(*) FROM public.proposals WHERE status = 'accepted') AS accepted_proposals,
  (SELECT COUNT(*) FROM public.messages) AS total_messages,
  (SELECT COUNT(DISTINCT sender_id) FROM public.messages WHERE created_at > now() - interval '7 days') AS active_users_week,
  (SELECT COUNT(*) FROM public.users WHERE created_at > now() - interval '30 days') AS new_users_month
WHERE public.is_admin(auth.uid());

DROP VIEW IF EXISTS public.task_statistics;
CREATE VIEW public.task_statistics AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status = 'todo') AS todo_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
  COUNT(*) FILTER (WHERE status = 'on_hold') AS on_hold_count,
  COUNT(*) FILTER (WHERE due_date < now() AND status NOT IN ('completed', 'cancelled')) AS overdue_count,
  COUNT(*) AS total_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::NUMERIC(10,2) AS avg_completion_hours
FROM public.tasks
WHERE is_archived = false
  AND (
    public.is_admin(auth.uid())
    OR organization_id IN (
      SELECT id FROM public.organization_profiles WHERE user_id = auth.uid()
    )
  )
GROUP BY organization_id;

DROP VIEW IF EXISTS public.user_task_assignments;
CREATE VIEW public.user_task_assignments AS
SELECT
  u.id AS user_id,
  u.email,
  u.role,
  COUNT(t.id) FILTER (WHERE t.status = 'todo') AS todo_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'completed' AND t.completed_at >= now() - interval '7 days') AS completed_this_week,
  COUNT(t.id) FILTER (WHERE t.due_date < now() AND t.status NOT IN ('completed', 'cancelled')) AS overdue_tasks
FROM public.users u
LEFT JOIN public.tasks t ON t.assignee_id = u.id AND t.is_archived = false
WHERE public.is_admin(auth.uid())
   OR u.id = auth.uid()
GROUP BY u.id, u.email, u.role;

INSERT INTO public.categories (name, slug, description) VALUES
  ('멘토링/강의', 'mentoring', 'Mentoring, lecture, education, workshop projects'),
  ('투자 매칭', 'investment', 'Investment and fundraising matching projects'),
  ('서비스 아웃소싱', 'service', 'Outsourcing, service, marketing, design and operations projects'),
  ('컨설팅', 'consulting', 'Business, product and technical consulting projects'),
  ('개발', 'development', 'Software and product development projects')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES
  ('profile-images', 'profile-images', true, 10485760),
  ('portfolio-files', 'portfolio-files', false, 10485760),
  ('documents', 'documents', false, 10485760),
  ('attachments', 'attachments', false, 10485760),
  ('messages', 'messages', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_category_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
CREATE POLICY "users_select_own_or_admin" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;
CREATE POLICY "users_update_own_or_admin" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "expert_profiles_select_available" ON public.expert_profiles;
CREATE POLICY "expert_profiles_select_available" ON public.expert_profiles
  FOR SELECT USING (is_available = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "expert_profiles_insert_own" ON public.expert_profiles;
CREATE POLICY "expert_profiles_insert_own" ON public.expert_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "expert_profiles_update_own_or_admin" ON public.expert_profiles;
CREATE POLICY "expert_profiles_update_own_or_admin" ON public.expert_profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "expert_profiles_delete_own_or_admin" ON public.expert_profiles;
CREATE POLICY "expert_profiles_delete_own_or_admin" ON public.expert_profiles
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "organization_profiles_select" ON public.organization_profiles;
CREATE POLICY "organization_profiles_select" ON public.organization_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "organization_profiles_insert_own" ON public.organization_profiles;
CREATE POLICY "organization_profiles_insert_own" ON public.organization_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "organization_profiles_update_own_or_admin" ON public.organization_profiles;
CREATE POLICY "organization_profiles_update_own_or_admin" ON public.organization_profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "organization_profiles_delete_own_or_admin" ON public.organization_profiles;
CREATE POLICY "organization_profiles_delete_own_or_admin" ON public.organization_profiles
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "campaigns_select_visible" ON public.campaigns;
CREATE POLICY "campaigns_select_visible" ON public.campaigns
  FOR SELECT USING (
    status IN ('active', 'in_progress', 'completed')
    OR public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaigns_insert_own_org" ON public.campaigns;
CREATE POLICY "campaigns_insert_own_org" ON public.campaigns
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaigns_update_own_org_or_admin" ON public.campaigns;
CREATE POLICY "campaigns_update_own_org_or_admin" ON public.campaigns
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaigns_delete_own_org_or_admin" ON public.campaigns;
CREATE POLICY "campaigns_delete_own_org_or_admin" ON public.campaigns
  FOR DELETE USING (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "proposals_select_related" ON public.proposals;
CREATE POLICY "proposals_select_related" ON public.proposals
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
    OR campaign_id IN (
      SELECT c.id
      FROM public.campaigns c
      JOIN public.organization_profiles op ON op.id = c.organization_id
      WHERE op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proposals_insert_own_expert" ON public.proposals;
CREATE POLICY "proposals_insert_own_expert" ON public.proposals
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "proposals_update_related" ON public.proposals;
CREATE POLICY "proposals_update_related" ON public.proposals
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR campaign_id IN (
      SELECT c.id
      FROM public.campaigns c
      JOIN public.organization_profiles op ON op.id = c.organization_id
      WHERE op.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR campaign_id IN (
      SELECT c.id
      FROM public.campaigns c
      JOIN public.organization_profiles op ON op.id = c.organization_id
      WHERE op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "connection_requests_select_related" ON public.connection_requests;
CREATE POLICY "connection_requests_select_related" ON public.connection_requests
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "connection_requests_insert_own_org" ON public.connection_requests;
CREATE POLICY "connection_requests_insert_own_org" ON public.connection_requests
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "connection_requests_update_related" ON public.connection_requests;
CREATE POLICY "connection_requests_update_related" ON public.connection_requests
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "message_threads_select_participants" ON public.message_threads;
CREATE POLICY "message_threads_select_participants" ON public.message_threads
  FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "message_threads_insert_participants" ON public.message_threads;
CREATE POLICY "message_threads_insert_participants" ON public.message_threads
  FOR INSERT WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "messages_insert_sender" ON public.messages;
CREATE POLICY "messages_insert_sender" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "messages_update_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender_or_admin" ON public.messages;
CREATE POLICY "messages_update_sender_or_admin" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (sender_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "messages_delete_sender_or_admin" ON public.messages;
CREATE POLICY "messages_delete_sender_or_admin" ON public.messages
  FOR DELETE USING (sender_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "message_attachments_select_participants" ON public.message_attachments;
CREATE POLICY "message_attachments_select_participants" ON public.message_attachments
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR message_id IN (SELECT id FROM public.messages WHERE sender_id = auth.uid() OR receiver_id = auth.uid())
  );

DROP POLICY IF EXISTS "message_attachments_insert_participants" ON public.message_attachments;
CREATE POLICY "message_attachments_insert_participants" ON public.message_attachments
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR message_id IN (SELECT id FROM public.messages WHERE sender_id = auth.uid() OR receiver_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_logs_admin_only" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_only" ON public.admin_logs
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_audit_logs_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_only" ON public.admin_audit_logs
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_invitations_public_pending_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_select_admin_or_invitee" ON public.user_invitations;
CREATE POLICY "user_invitations_select_admin_or_invitee" ON public.user_invitations
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS "user_invitations_admin_insert" ON public.user_invitations;
CREATE POLICY "user_invitations_admin_insert" ON public.user_invitations
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_invitations_update_admin_or_invitee" ON public.user_invitations;
CREATE POLICY "user_invitations_update_admin_or_invitee" ON public.user_invitations
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_select_related" ON public.tasks;
CREATE POLICY "tasks_select_related" ON public.tasks
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR creator_id = auth.uid()
    OR assignee_id = auth.uid()
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_insert_creator" ON public.tasks;
CREATE POLICY "tasks_insert_creator" ON public.tasks
  FOR INSERT WITH CHECK (creator_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tasks_update_related" ON public.tasks;
CREATE POLICY "tasks_update_related" ON public.tasks
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR creator_id = auth.uid()
    OR assignee_id = auth.uid()
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR creator_id = auth.uid()
    OR assignee_id = auth.uid()
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "task_categories_select_related" ON public.task_categories;
CREATE POLICY "task_categories_select_related" ON public.task_categories
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "task_categories_manage_org" ON public.task_categories;
CREATE POLICY "task_categories_manage_org" ON public.task_categories
  FOR ALL USING (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "task_category_relations_visible_tasks" ON public.task_category_relations;
CREATE POLICY "task_category_relations_visible_tasks" ON public.task_category_relations
  FOR ALL USING (
    public.is_admin(auth.uid())
    OR task_id IN (SELECT id FROM public.tasks)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR task_id IN (SELECT id FROM public.tasks)
  );

DROP POLICY IF EXISTS "task_comments_visible_tasks" ON public.task_comments;
CREATE POLICY "task_comments_visible_tasks" ON public.task_comments
  FOR SELECT USING (public.is_admin(auth.uid()) OR task_id IN (SELECT id FROM public.tasks));

DROP POLICY IF EXISTS "task_comments_insert_visible_tasks" ON public.task_comments;
CREATE POLICY "task_comments_insert_visible_tasks" ON public.task_comments
  FOR INSERT WITH CHECK (user_id = auth.uid() AND task_id IN (SELECT id FROM public.tasks));

DROP POLICY IF EXISTS "task_activity_logs_visible_tasks" ON public.task_activity_logs;
CREATE POLICY "task_activity_logs_visible_tasks" ON public.task_activity_logs
  FOR SELECT USING (public.is_admin(auth.uid()) OR task_id IN (SELECT id FROM public.tasks));

DROP POLICY IF EXISTS "task_attachments_visible_tasks" ON public.task_attachments;
CREATE POLICY "task_attachments_visible_tasks" ON public.task_attachments
  FOR SELECT USING (public.is_admin(auth.uid()) OR task_id IN (SELECT id FROM public.tasks));

DROP POLICY IF EXISTS "task_attachments_insert_visible_tasks" ON public.task_attachments;
CREATE POLICY "task_attachments_insert_visible_tasks" ON public.task_attachments
  FOR INSERT WITH CHECK (uploaded_by = auth.uid() AND task_id IN (SELECT id FROM public.tasks));

DROP POLICY IF EXISTS "task_reminders_own" ON public.task_reminders;
CREATE POLICY "task_reminders_own" ON public.task_reminders
  FOR ALL USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_notification_settings_own" ON public.user_notification_settings;
CREATE POLICY "user_notification_settings_own" ON public.user_notification_settings
  FOR ALL USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks
  FOR ALL USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "search_logs_own" ON public.search_logs;
CREATE POLICY "search_logs_own" ON public.search_logs
  FOR ALL USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "matching_logs_related" ON public.matching_logs;
CREATE POLICY "matching_logs_related" ON public.matching_logs
  FOR ALL USING (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
    OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "error_logs_insert_any" ON public.error_logs;
CREATE POLICY "error_logs_insert_any" ON public.error_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "error_logs_admin_select" ON public.error_logs;
CREATE POLICY "error_logs_admin_select" ON public.error_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "rate_limits_own" ON public.rate_limits;
CREATE POLICY "rate_limits_own" ON public.rate_limits
  FOR ALL USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "security_audit_logs_admin_only" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_admin_only" ON public.security_audit_logs
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_public_read_app_buckets" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_insert_app_buckets" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_update_app_buckets" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_delete_app_buckets" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_read_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_read_own_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_read_message_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_insert_own_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_insert_message_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_update_own_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_update_message_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_delete_own_files" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_delete_message_files" ON storage.objects;

CREATE POLICY "storage_public_read_profile_images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'profile-images');

CREATE POLICY "storage_authenticated_read_own_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('portfolio-files', 'documents', 'attachments')
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_authenticated_read_message_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'messages'
    AND public.is_campaign_participant(public.storage_path_campaign_id(name), auth.uid())
  );

CREATE POLICY "storage_authenticated_insert_own_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('profile-images', 'portfolio-files', 'documents', 'attachments')
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_authenticated_insert_message_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'messages'
    AND public.is_campaign_participant(public.storage_path_campaign_id(name), auth.uid())
  );

CREATE POLICY "storage_authenticated_update_own_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('profile-images', 'portfolio-files', 'documents', 'attachments')
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id IN ('profile-images', 'portfolio-files', 'documents', 'attachments')
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_authenticated_update_message_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'messages'
    AND public.is_campaign_participant(public.storage_path_campaign_id(name), auth.uid())
  )
  WITH CHECK (
    bucket_id = 'messages'
    AND public.is_campaign_participant(public.storage_path_campaign_id(name), auth.uid())
  );

CREATE POLICY "storage_authenticated_delete_own_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('profile-images', 'portfolio-files', 'documents', 'attachments')
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "storage_authenticated_delete_message_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'messages'
    AND public.is_campaign_participant(public.storage_path_campaign_id(name), auth.uid())
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT SELECT ON public.expert_profiles TO anon, authenticated;
GRANT SELECT ON public.organization_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.expert_search_view TO authenticated;
GRANT SELECT ON public.campaign_list_view TO authenticated;
GRANT SELECT ON public.message_thread_view TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.admin_statistics TO authenticated;
GRANT SELECT ON public.task_statistics TO authenticated;
GRANT SELECT ON public.user_task_assignments TO authenticated;
GRANT INSERT ON public.error_logs TO anon;
REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unread_notification_count(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unread_message_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unread_message_count(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_message_thread(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_message(UUID, UUID, UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_messages_as_read(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_messages_read(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_expert_hashtags(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_campaign_experts(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_notification_preference(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_invitation_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_campaign_participant(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_send_message(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.storage_path_campaign_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_expert_hashtags(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_campaign_experts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_notification_preference(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_message(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_path_campaign_id(TEXT) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

SELECT 'StartupMatching baseline schema installed' AS status;
