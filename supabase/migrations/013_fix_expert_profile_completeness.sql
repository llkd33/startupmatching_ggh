-- Redefine profile completeness calculation to use NEW values directly
CREATE OR REPLACE FUNCTION public.update_profile_completeness()
RETURNS TRIGGER AS $$
DECLARE
  v_completeness INTEGER := 0;
BEGIN
  IF COALESCE(btrim(NEW.name), '') <> '' THEN
    v_completeness := v_completeness + 10;
  END IF;

  IF COALESCE(btrim(NEW.title), '') <> '' THEN
    v_completeness := v_completeness + 10;
  END IF;

  IF COALESCE(length(NEW.bio), 0) > 50 THEN
    v_completeness := v_completeness + 10;
  END IF;

  IF COALESCE(btrim(NEW.location), '') <> '' THEN
    v_completeness := v_completeness + 10;
  END IF;

  IF COALESCE(jsonb_array_length(NEW.career_history), 0) > 0 THEN
    v_completeness := v_completeness + 15;
  END IF;

  IF COALESCE(jsonb_array_length(NEW.education), 0) > 0 THEN
    v_completeness := v_completeness + 15;
  END IF;

  IF COALESCE(array_length(NEW.skills, 1), 0) >= 3 THEN
    v_completeness := v_completeness + 10;
  END IF;

  IF COALESCE(array_length(NEW.hashtags, 1), 0) >= 3 THEN
    v_completeness := v_completeness + 10;
  END IF;

  IF NEW.hourly_rate IS NOT NULL THEN
    v_completeness := v_completeness + 5;
  END IF;

  IF COALESCE(btrim(NEW.portfolio_url), '') <> '' THEN
    v_completeness := v_completeness + 5;
  END IF;

  NEW.profile_completeness := LEAST(GREATEST(v_completeness, 0), 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure it exists
DROP TRIGGER IF EXISTS update_profile_completeness_trigger ON public.expert_profiles;
CREATE TRIGGER update_profile_completeness_trigger
  BEFORE INSERT OR UPDATE ON public.expert_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_completeness();

-- Backfill existing profiles with the new calculation
UPDATE public.expert_profiles
SET profile_completeness = LEAST(
  GREATEST(
    (CASE WHEN COALESCE(btrim(name), '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(btrim(title), '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(length(bio), 0) > 50 THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(btrim(location), '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(jsonb_array_length(career_history), 0) > 0 THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(jsonb_array_length(education), 0) > 0 THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(array_length(skills, 1), 0) >= 3 THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(array_length(hashtags, 1), 0) >= 3 THEN 10 ELSE 0 END) +
    (CASE WHEN hourly_rate IS NOT NULL THEN 5 ELSE 0 END) +
    (CASE WHEN COALESCE(btrim(portfolio_url), '') <> '' THEN 5 ELSE 0 END),
    0
  ),
  100
);

DO $$ BEGIN
  RAISE NOTICE '✅ expert profile completeness recalculation applied';
END $$;
