-- Fix log_security_event() to avoid referencing missing columns on other tables
-- Addresses 42703 errors when auditing tables without is_verified (e.g. public.users)

CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER AS $$
DECLARE
    v_risk_level TEXT;
BEGIN
    -- Determine risk level safely without assuming is_verified exists
    IF TG_OP = 'DELETE' THEN
        v_risk_level := 'high';
    ELSIF TG_TABLE_NAME IN ('users', 'admin_audit_logs') THEN
        v_risk_level := 'high';
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'organization_profiles' THEN
        -- Only organization_profiles has is_verified, so it's safe to compare
        IF (OLD).is_verified IS DISTINCT FROM (NEW).is_verified THEN
            v_risk_level := 'critical';
        ELSE
            v_risk_level := 'medium';
        END IF;
    ELSE
        v_risk_level := 'medium';
    END IF;

    INSERT INTO public.security_audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        risk_level,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_risk_level,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        inet(current_setting('request.headers', true)::json->>'x-forwarded-for'),
        current_setting('request.headers', true)::json->>'user-agent'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  RAISE NOTICE '✅ log_security_event() updated to safely handle tables without is_verified';
END $$;
