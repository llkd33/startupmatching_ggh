import { checkAdminAuth } from '@/lib/admin'
import { Shield } from 'lucide-react'
import AdminStatsClient from '@/components/admin/AdminStatsClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  await checkAdminAuth()

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-foreground">슈퍼 관리자 대시보드</h1>
        </div>
        <p className="text-gray-600">시스템 전체 현황을 모니터링하고 관리합니다</p>
      </div>

      <AdminStatsClient />
    </div>
  )
}
