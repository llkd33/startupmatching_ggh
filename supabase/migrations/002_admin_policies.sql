-- Admin RLS Policies
-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can view all organization profiles
CREATE POLICY "Admins can view all organizations" ON public.organization_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all organization profiles (for verification)
CREATE POLICY "Admins can update all organizations" ON public.organization_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can view all campaigns
CREATE POLICY "Admins can view all campaigns" ON public.campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all campaigns (for moderation)
CREATE POLICY "Admins can update all campaigns" ON public.campaigns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can view all proposals
CREATE POLICY "Admins can view all proposals" ON public.proposals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can view all expert profiles
CREATE POLICY "Admins can view all expert profiles" ON public.expert_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create admin audit log table
CREATE TABLE public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT, admin_password TEXT)
RETURNS VOID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- This function should be called from server-side only
    -- Create auth user
    -- Note: In production, use Supabase Admin API to create the user
    
    -- Update the user role to admin
    UPDATE public.users 
    SET role = 'admin' 
    WHERE email = admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;