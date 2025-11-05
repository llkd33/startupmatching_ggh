import { checkAdminAuth, getServerSupabase } from '@/lib/admin'
import AdminActivityLogs from '@/components/admin/AdminActivityLogs'

export const dynamic = 'force-dynamic'

export default async function AdminLogsPage() {
  await checkAdminAuth()

  const supabase = getServerSupabase()
  const { data } = await supabase
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <AdminActivityLogs
      logs={data || []}
      onRefresh={async () => {
        const supabase = getServerSupabase()
        const { data } = await supabase
          .from('admin_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        return data || []
      }}
    />
  )
}
