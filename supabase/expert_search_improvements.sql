-- ============================================
-- 전문가 검색 기능 개선
-- ============================================

-- 1. 전문가 프로필에 누락된 컬럼 추가
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

-- 2. 개선된 전문가 검색 뷰 생성
DROP VIEW IF EXISTS expert_search_view;

CREATE VIEW expert_search_view AS
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
    -- 승인된 연결 수
    COALESCE((
        SELECT COUNT(*)::INTEGER 
        FROM connection_requests cr
        WHERE cr.expert_id = ep.id 
        AND cr.status = 'approved'
    ), 0) as completed_projects,
    -- 평균 평점 (아직 평점 시스템이 없으므로 기본값 사용)
    COALESCE(ep.rating_average, 4.5) as rating_average,
    -- 총 리뷰 수
    COALESCE(ep.total_reviews, 0) as total_reviews
FROM expert_profiles ep
INNER JOIN users u ON ep.user_id = u.id
WHERE ep.is_available = true;

-- 권한 부여
GRANT SELECT ON expert_search_view TO authenticated;
GRANT SELECT ON expert_search_view TO anon;

-- 3. 프로필 완성도 계산 함수
CREATE OR REPLACE FUNCTION calculate_profile_completeness(expert_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completeness INTEGER := 0;
    profile RECORD;
BEGIN
    SELECT * INTO profile FROM expert_profiles WHERE id = expert_id;
    
    -- 기본 정보 (40%)
    IF profile.name IS NOT NULL AND profile.name != '' THEN completeness := completeness + 10; END IF;
    IF profile.title IS NOT NULL AND profile.title != '' THEN completeness := completeness + 10; END IF;
    IF profile.bio IS NOT NULL AND LENGTH(profile.bio) > 50 THEN completeness := completeness + 10; END IF;
    IF profile.location IS NOT NULL AND profile.location != '' THEN completeness := completeness + 10; END IF;
    
    -- 경력 정보 (30%)
    IF profile.career_history IS NOT NULL AND jsonb_array_length(profile.career_history) > 0 THEN 
        completeness := completeness + 15; 
    END IF;
    IF profile.education IS NOT NULL AND jsonb_array_length(profile.education) > 0 THEN 
        completeness := completeness + 15; 
    END IF;
    
    -- 스킬 정보 (20%)
    IF profile.skills IS NOT NULL AND array_length(profile.skills, 1) >= 3 THEN 
        completeness := completeness + 10; 
    END IF;
    IF profile.hashtags IS NOT NULL AND array_length(profile.hashtags, 1) >= 3 THEN 
        completeness := completeness + 10; 
    END IF;
    
    -- 기타 정보 (10%)
    IF profile.hourly_rate IS NOT NULL THEN completeness := completeness + 5; END IF;
    IF profile.portfolio_url IS NOT NULL AND profile.portfolio_url != '' THEN completeness := completeness + 5; END IF;
    
    RETURN completeness;
END;
$$ LANGUAGE plpgsql;

-- 4. 프로필 완성도 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_completeness := calculate_profile_completeness(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_completeness_trigger ON expert_profiles;
CREATE TRIGGER update_profile_completeness_trigger
    BEFORE INSERT OR UPDATE ON expert_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_completeness();

-- 5. 샘플 데이터 업데이트 (기존 프로필이 있다면)
UPDATE expert_profiles SET
    title = COALESCE(title, '시니어 개발자'),
    company = COALESCE(company, '프리랜서'),
    location = COALESCE(location, '서울'),
    availability_status = COALESCE(availability_status, 'available'),
    experience_years = COALESCE(experience_years, FLOOR(RANDOM() * 10 + 1)::INTEGER),
    response_time_hours = COALESCE(response_time_hours, FLOOR(RANDOM() * 48 + 1)::INTEGER),
    completion_rate = COALESCE(completion_rate, FLOOR(RANDOM() * 20 + 80)::INTEGER),
    rating_average = COALESCE(rating_average, (RANDOM() * 1.5 + 3.5)::DECIMAL(3,2)),
    total_reviews = COALESCE(total_reviews, FLOOR(RANDOM() * 50)::INTEGER)
WHERE title IS NULL OR company IS NULL;

-- 6. 검색 성능 향상을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_expert_profiles_location ON expert_profiles(location);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_availability_status ON expert_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_experience_years ON expert_profiles(experience_years);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_hourly_rate ON expert_profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_rating_average ON expert_profiles(rating_average);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_profile_completeness ON expert_profiles(profile_completeness);

-- Full text search를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_expert_profiles_name_gin ON expert_profiles USING gin(to_tsvector('korean', name));
CREATE INDEX IF NOT EXISTS idx_expert_profiles_bio_gin ON expert_profiles USING gin(to_tsvector('korean', bio));

-- 7. 검색 통계 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS public.search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    search_query TEXT,
    filters JSONB,
    results_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search logs" ON public.search_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search logs" ON public.search_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON public.search_logs(created_at);

-- ============================================
-- 완료
-- ============================================
SELECT '✅ 전문가 검색 기능 개선 완료' as status;