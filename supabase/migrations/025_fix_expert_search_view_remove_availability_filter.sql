-- Fix expert_search_view to show all experts regardless of is_available status
-- This allows organizations to see all experts, not just those marked as available

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
INNER JOIN public.users u ON ep.user_id = u.id;
-- Removed WHERE ep.is_available = true filter to show all experts

-- Grant access to the view
GRANT SELECT ON public.expert_search_view TO authenticated;
GRANT SELECT ON public.expert_search_view TO anon;

DO $$ BEGIN
  RAISE NOTICE '✅ expert_search_view updated to show all experts';
END $$;

