-- Add campaign_id column to messages table if it doesn't exist
-- This migration ensures messages table has campaign_id column for proper thread matching

DO $$
BEGIN
    -- Check if campaign_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'campaign_id'
    ) THEN
        -- Add campaign_id column (nullable to support existing data)
        ALTER TABLE public.messages 
        ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
        
        RAISE NOTICE '✅ Added campaign_id column to messages table';
    ELSE
        RAISE NOTICE 'ℹ️ campaign_id column already exists in messages table';
    END IF;
    
    -- Check if proposal_id column exists and add if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'proposal_id'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_messages_proposal_id ON public.messages(proposal_id);
        
        RAISE NOTICE '✅ Added proposal_id column to messages table';
    END IF;
    
    -- Check if message_type column exists and add if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system'));
        
        RAISE NOTICE '✅ Added message_type column to messages table';
    END IF;
    
    -- Check if read_at column exists and add if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN read_at TIMESTAMPTZ;
        
        RAISE NOTICE '✅ Added read_at column to messages table';
    END IF;
    
    -- Check if updated_at column exists and add if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE '✅ Added updated_at column to messages table';
    END IF;
END
$$;

