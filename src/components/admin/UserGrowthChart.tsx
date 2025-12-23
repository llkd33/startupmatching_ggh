'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartData {
  date: string
  전문가: number
  기관: number
  총합: number
}

interface UserGrowthChartProps {
  days?: number
}

export function UserGrowthChart({ days = 30 }: UserGrowthChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserGrowthData()
  }, [days])

  const fetchUserGrowthData = async () => {
    setLoading(true)
    setError(null)

    try {
      // 지난 N일간 날짜 생성
      const dates: string[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])
      }

      // 전문가 프로필 생성일 조회
      const { data: expertData, error: expertError } = await supabase
        .from('expert_profiles')
        .select('created_at')
        .gte('created_at', dates[0])
        .order('created_at', { ascending: true })

      if (expertError) throw expertError

      // 기관 프로필 생성일 조회
      const { data: orgData, error: orgError } = await supabase
        .from('organization_profiles')
        .select('created_at')
        .gte('created_at', dates[0])
        .order('created_at', { ascending: true })

      if (orgError) throw orgError

      // 날짜별 카운트 집계
      const expertCounts: Record<string, number> = {}
      const orgCounts: Record<string, number> = {}

      expertData?.forEach((item) => {
        const date = new Date(item.created_at).toISOString().split('T')[0]
        expertCounts[date] = (expertCounts[date] || 0) + 1
      })

      orgData?.forEach((item) => {
        const date = new Date(item.created_at).toISOString().split('T')[0]
        orgCounts[date] = (orgCounts[date] || 0) + 1
      })

      // 차트 데이터 생성 (누적)
      let cumulativeExpert = 0
      let cumulativeOrg = 0

      // 시작일 이전의 누적 수 조회
      const { count: prevExpertCount } = await supabase
        .from('expert_profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', dates[0])

      const { count: prevOrgCount } = await supabase
        .from('organization_profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', dates[0])

      cumulativeExpert = prevExpertCount || 0
      cumulativeOrg = prevOrgCount || 0

      const chartData: ChartData[] = dates.map((date) => {
        cumulativeExpert += expertCounts[date] || 0
        cumulativeOrg += orgCounts[date] || 0

        return {
          date: formatDate(date),
          전문가: cumulativeExpert,
          기관: cumulativeOrg,
          총합: cumulativeExpert + cumulativeOrg,
        }
      })

      setData(chartData)
    } catch (err) {
      console.error('Error fetching user growth data:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorExpert" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOrg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="전문가"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#colorExpert)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="기관"
          stroke="#8b5cf6"
          fillOpacity={1}
          fill="url(#colorOrg)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
