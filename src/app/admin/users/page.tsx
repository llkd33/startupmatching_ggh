import { checkAdminAuth, getServerSupabase } from '@/lib/admin'
import AdminUsersClient from './client'

export default async function AdminUsersPage() {
  await checkAdminAuth()
  
  // Fetch initial users data with profile information
  const supabase = getServerSupabase()
  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  return <AdminUsersClient initialUsers={users || []} />
}
