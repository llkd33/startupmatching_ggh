import { checkAdminAuth, getServerSupabase } from '@/lib/admin'
import AdminInvitationsClient from './client'

export const dynamic = 'force-dynamic'

export default async function AdminInvitationsPage() {
  await checkAdminAuth()

  const supabase = getServerSupabase()
  // 초기 로드는 첫 페이지만 (20개)
  const { data: invitations, count } = await supabase
    .from('user_invitations')
    .select(`
      *,
      invited_by_user:users!user_invitations_invited_by_fkey(id, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 19) // 첫 페이지만

  return <AdminInvitationsClient
    initialInvitations={invitations || []}
    initialTotal={count || 0}
  />
}

