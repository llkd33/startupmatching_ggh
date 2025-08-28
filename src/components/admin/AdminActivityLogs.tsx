"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { severityLabel } from '@/lib/i18n/status';
import { 
  Search, 
  Filter,
  Download,
  RefreshCw,
  User,
  Shield,
  Activity,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SkeletonTable } from '@/components/ui/skeleton';

interface ActivityLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface AdminActivityLogsProps {
  logs: ActivityLog[];
  onRefresh: () => Promise<ActivityLog[] | void> | void;
}

export default function AdminActivityLogs({ logs: initialLogs, onRefresh }: AdminActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filterAction, setFilterAction] = useState(searchParams.get('action') || 'all');
  const [filterSeverity, setFilterSeverity] = useState(searchParams.get('severity') || 'all');
  const [dateRange, setDateRange] = useState(searchParams.get('range') || '7days');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const logsPerPage = 20;
  const debouncedSearch = useDebouncedValue(searchTerm, 350);

  // URL sync for filters (debounced)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('q', debouncedSearch); else params.delete('q');
    if (filterAction && filterAction !== 'all') params.set('action', filterAction); else params.delete('action');
    if (filterSeverity && filterSeverity !== 'all') params.set('severity', filterSeverity); else params.delete('severity');
    if (dateRange && dateRange !== '7days') params.set('range', dateRange); else params.delete('range');
    router.replace(`${pathname}?${params.toString()}`);
    // reset to first page when filters change
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterAction, filterSeverity, dateRange]);

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <User className="w-4 h-4" />;
    if (action.includes('ADMIN')) return <Shield className="w-4 h-4" />;
    if (action.includes('CAMPAIGN')) return <FileText className="w-4 h-4" />;
    if (action.includes('SETTINGS')) return <Settings className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('GRANT') || action.includes('REVOKE')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const filteredLogs = useMemo(() => logs.filter(log => {
    const matchesSearch = 
      log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action.includes(filterAction);
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    
    // Date range filter
    if (dateRange !== 'all') {
      const logDate = new Date(log.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateRange === 'today' && daysDiff > 0) return false;
      if (dateRange === '7days' && daysDiff > 7) return false;
      if (dateRange === '30days' && daysDiff > 30) return false;
    }
    
    return matchesSearch && matchesAction && matchesSeverity;
  }), [logs, searchTerm, filterAction, filterSeverity, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  const handleExport = () => {
    // Export logs as CSV
    const csv = [
      ['Date', 'Admin', 'Action', 'Entity', 'Details', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.admin_email,
        log.action,
        `${log.entity_type}:${log.entity_id}`,
        JSON.stringify(log.details || {}),
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const actionTypes = [
    { value: 'all', label: '모든 작업' },
    { value: 'USER', label: '사용자 관리' },
    { value: 'CAMPAIGN', label: '캠페인 관리' },
    { value: 'ADMIN', label: '관리자 권한' },
    { value: 'DELETE', label: '삭제 작업' },
    { value: 'SETTINGS', label: '설정 변경' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">활동 로그</h1>
          <p className="text-gray-600 mt-1">관리자 활동 내역을 모니터링합니다</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" aria-label="로그 내보내기">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
          <Button
            onClick={async () => {
              setLoading(true);
              const result = await onRefresh();
              if (Array.isArray(result)) setLogs(result);
              setLoading(false);
            }}
            variant="outline"
            aria-label="새로고침"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 활동</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">오늘 활동</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => {
                    const today = new Date().toDateString();
                    return new Date(l.created_at).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">경고 활동</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {logs.filter(l => l.severity === 'warning').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">오류 활동</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(l => l.severity === 'error' || l.severity === 'critical').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="관리자, 작업 검색..."
                className="pl-10 pr-4 py-2 w-full border rounded-lg"
              />
            </div>
            
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">모든 심각도</option>
              <option value="info">정보</option>
              <option value="warning">경고</option>
              <option value="error">오류</option>
              <option value="critical">심각</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="today">오늘</option>
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="all">전체 기간</option>
            </select>

            <div className="text-sm text-gray-600 flex items-center">
              {filteredLogs.length}개 결과
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4">
              <SkeletonTable rows={10} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">관리자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">대상</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상세</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">심각도</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!loading && paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      활동 로그가 없습니다
                      {(searchTerm || filterAction !== 'all' || filterSeverity !== 'all' || dateRange !== '7days') && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSearchTerm('');
                              setFilterAction('all');
                              setFilterSeverity('all');
                              setDateRange('7days');
                            }}
                          >
                            필터 초기화
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-medium">{new Date(log.created_at).toLocaleDateString('ko-KR')}</p>
                          <p className="text-gray-500">{new Date(log.created_at).toLocaleTimeString('ko-KR')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.admin_name}</p>
                          <p className="text-xs text-gray-500">{log.admin_email}</p>
                          {log.ip_address && (
                            <p className="text-xs text-gray-400">IP: {log.ip_address}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                          </div>
                          <span className="text-sm font-medium">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.entity_type && (
                          <div className="text-sm">
                            <p className="font-medium">{log.entity_name || log.entity_id}</p>
                            <p className="text-gray-500">{log.entity_type}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.details && (
                          <div className="text-xs text-gray-600">
                            <pre className="whitespace-pre-wrap max-w-xs">
                              {JSON.stringify(log.details, null, 2).substring(0, 100)}...
                            </pre>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getSeverityColor(log.severity)}>
                          {severityLabel(log.severity)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {startIndex + 1} - {Math.min(startIndex + logsPerPage, filteredLogs.length)} / 총 {filteredLogs.length}개
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
