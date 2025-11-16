-- Create message_threads table for organizing messages by conversation threads
-- This table tracks conversations between participants within campaigns

-- Create message_threads table
CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    participant_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, participant_1, participant_2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON public.message_threads(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_message_threads_campaign_id ON public.message_threads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON public.message_threads(last_message_at DESC);

-- Enable RLS
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their message threads" ON public.message_threads;
DROP POLICY IF EXISTS "Users can create message threads" ON public.message_threads;
DROP POLICY IF EXISTS "Users can update their message threads" ON public.message_threads;

-- RLS Policies for message_threads
CREATE POLICY "Users can view their message threads" ON public.message_threads
    FOR SELECT USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

CREATE POLICY "Users can create message threads" ON public.message_threads
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

CREATE POLICY "Users can update their message threads" ON public.message_threads
    FOR UPDATE USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.message_threads TO anon;

-- Add comment
COMMENT ON TABLE public.message_threads IS 
  'Tracks conversation threads between participants within campaigns. 
   Each thread represents a conversation between two users in a specific campaign context.';

DO $$ 
BEGIN
    RAISE NOTICE '✅ message_threads table created successfully';
END $$;

