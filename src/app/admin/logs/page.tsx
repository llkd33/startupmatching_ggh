import { checkAdminAuth } from '@/lib/admin'
import AdminLogsEnhanced from '@/components/admin/AdminLogsEnhanced'

export const dynamic = 'force-dynamic'

export default async function AdminLogsPage() {
  await checkAdminAuth()

  return <AdminLogsEnhanced />
}
