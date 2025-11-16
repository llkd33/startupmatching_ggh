import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Mail,
} from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /admin/login 페이지는 인증 체크를 건너뛰기
  // Next.js App Router에서는 pathname을 직접 가져올 수 없으므로
  // children의 타입을 확인하거나, 클라이언트 컴포넌트로 위임
  // 대신 middleware에서 이미 처리했으므로, 여기서는 간단히 체크
  const headersList = headers();
  const pathnameHeader = headersList.get('x-pathname') || '';
  
  // pathname에서 /admin/login 확인 (정확히 일치)
  if (pathnameHeader === '/admin/login') {
    // 로그인 페이지는 레이아웃 없이 렌더링
    return <>{children}</>;
  }

  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();

  // 허용 기준: users.is_admin = true 또는 role === 'admin'
  if (!userData || (!userData.is_admin && userData.role !== 'admin')) {
    redirect('/admin/login');
  }

  const navigationItems = [
    { href: '/admin', label: '대시보드', icon: Home },
    { href: '/admin/users', label: '사용자', icon: Users },
    { href: '/admin/invitations', label: '초대 관리', icon: Mail },
    { href: '/admin/campaigns', label: '캠페인', icon: Briefcase },
    { href: '/admin/proposals', label: '제안서', icon: FileText },
    { href: '/admin/analytics', label: '분석', icon: BarChart3 },
    { href: '/admin/settings', label: '설정', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800">관리자 패널</h1>
          </div>

          <AdminNav items={navigationItems} />

          <div className="mt-auto p-6">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </button>
            </form>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
