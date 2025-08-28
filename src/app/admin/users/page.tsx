import { checkAdminAuth, logAdminAction } from '@/lib/admin'
import { supabase } from '@/lib/supabase'
import AdminUsersClient from './client'

export default async function AdminUsersPage() {
  await checkAdminAuth()
  
  // Fetch initial users data with profile information
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  return <AdminUsersClient initialUsers={users || []} />
}