import { checkAdminAuth, getServerSupabase } from '@/lib/admin'
import AdminInvitationsClient from './client'

export const dynamic = 'force-dynamic'

export default async function AdminInvitationsPage() {
  await checkAdminAuth()

  const supabase = getServerSupabase()
  // 초기 로드는 첫 페이지만 (20개)
  const { data: invitations, count } = await supabase
    .from('user_invitations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 19) // 첫 페이지만

  // invited_by 정보를 한 번에 가져오기 (N+1 문제 해결)
  const invitedByIds = invitations
    ? [...new Set(invitations.map((inv: any) => inv.invited_by).filter(Boolean))]
    : []

  let usersMap = new Map()
  if (invitedByIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .in('id', invitedByIds)

    if (users) {
      users.forEach((user: any) => usersMap.set(user.id, user))
    }
  }

  const invitationsWithUser = invitations
    ? invitations.map((inv: any) => ({
        ...inv,
        invited_by_user: inv.invited_by ? usersMap.get(inv.invited_by) || null : null
      }))
    : []

  return <AdminInvitationsClient
    initialInvitations={invitationsWithUser}
    initialTotal={count || 0}
  />
}

