-- Ensure expert search view exists with required columns for dashboard queries
DO $$
BEGIN
  -- Add missing expert profile columns used by the view
  ALTER TABLE public.expert_profiles
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS company TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available'
      CHECK (availability_status IN ('available', 'busy', 'unavailable')),
    ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24,
    ADD COLUMN IF NOT EXISTS completion_rate INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
END $$;

-- Recreate the expert search view used by the dashboard
DROP VIEW IF EXISTS public.expert_search_view;

CREATE VIEW public.expert_search_view AS
SELECT 
    ep.id,
    ep.user_id,
    ep.name,
    ep.title,
    ep.company,
    ep.location,
    ep.bio,
    ep.career_history,
    ep.education,
    ep.skills,
    ep.hashtags,
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
    u.email,
    u.phone,
    COALESCE((
        SELECT COUNT(*)::INTEGER 
        FROM public.connection_requests cr
        WHERE cr.expert_id = ep.id 
          AND cr.status = 'approved'
    ), 0) AS completed_projects,
    COALESCE(ep.rating_average, 4.5) AS rating_average,
    COALESCE(ep.total_reviews, 0) AS total_reviews
FROM public.expert_profiles ep
INNER JOIN public.users u ON ep.user_id = u.id
WHERE ep.is_available = true;

-- Grant access to the view
GRANT SELECT ON public.expert_search_view TO authenticated;
GRANT SELECT ON public.expert_search_view TO anon;

-- Helper function to keep profile completeness in sync
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(expert_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completeness INTEGER := 0;
  profile RECORD;
BEGIN
  SELECT * INTO profile FROM public.expert_profiles WHERE id = expert_id;

  IF profile.name IS NOT NULL AND profile.name != '' THEN completeness := completeness + 10; END IF;
  IF profile.title IS NOT NULL AND profile.title != '' THEN completeness := completeness + 10; END IF;
  IF profile.bio IS NOT NULL AND LENGTH(profile.bio) > 50 THEN completeness := completeness + 10; END IF;
  IF profile.location IS NOT NULL AND profile.location != '' THEN completeness := completeness + 10; END IF;

  IF profile.career_history IS NOT NULL AND jsonb_array_length(profile.career_history) > 0 THEN completeness := completeness + 15; END IF;
  IF profile.education IS NOT NULL AND jsonb_array_length(profile.education) > 0 THEN completeness := completeness + 15; END IF;

  IF profile.skills IS NOT NULL AND array_length(profile.skills, 1) >= 3 THEN completeness := completeness + 10; END IF;
  IF profile.hashtags IS NOT NULL AND array_length(profile.hashtags, 1) >= 3 THEN completeness := completeness + 10; END IF;

  IF profile.hourly_rate IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF profile.portfolio_url IS NOT NULL AND profile.portfolio_url != '' THEN completeness := completeness + 5; END IF;

  RETURN completeness;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completeness := public.calculate_profile_completeness(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_completeness_trigger ON public.expert_profiles;
CREATE TRIGGER update_profile_completeness_trigger
  BEFORE INSERT OR UPDATE ON public.expert_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_completeness();

DO $$ BEGIN
  RAISE NOTICE '✅ expert_search_view recreated and supporting columns verified';
END $$;
