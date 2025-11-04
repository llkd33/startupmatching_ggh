-- User Invitations Table
-- 어드민이 사용자를 초대할 때 사용하는 테이블

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  organization_name TEXT,
  position TEXT,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('expert', 'organization')),
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);

-- RLS 정책
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- 관리자만 초대 생성 가능
CREATE POLICY "Admins can create invitations" ON public.user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'admin')
    )
  );

-- 관리자만 초대 조회 가능
CREATE POLICY "Admins can view invitations" ON public.user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'admin')
    )
  );

-- 토큰으로 본인 초대 조회 가능
CREATE POLICY "Users can view own invitation by token" ON public.user_invitations
  FOR SELECT
  USING (true); -- 토큰 검증은 API에서 처리

-- 초대 수락 시 업데이트 가능
CREATE POLICY "Can update invitation status" ON public.user_invitations
  FOR UPDATE
  USING (true); -- 토큰 검증은 API에서 처리

