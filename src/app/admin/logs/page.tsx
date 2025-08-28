import { supabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/admin'
import AdminActivityLogs from '@/components/admin/AdminActivityLogs'

export default async function AdminLogsPage() {
  await checkAdminAuth()

  const { data } = await supabase
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <AdminActivityLogs
      logs={data || []}
      onRefresh={async () => {
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

