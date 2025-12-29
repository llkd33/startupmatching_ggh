-- Add availability_schedule column to expert_profiles table
-- This stores the weekly availability schedule as JSON
-- Format: { "mon": ["09", "10", "14"], "tue": ["09", "10"] }

ALTER TABLE expert_profiles
ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN expert_profiles.availability_schedule IS 'Weekly availability schedule. Keys are day abbreviations (mon-sun), values are arrays of hour keys (09-18)';

-- Create index for efficient querying of experts with availability
CREATE INDEX IF NOT EXISTS idx_expert_profiles_availability_schedule
ON expert_profiles USING GIN (availability_schedule)
WHERE availability_schedule IS NOT NULL;
