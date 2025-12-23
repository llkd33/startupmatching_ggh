import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /admin/login 페이지는 인증 체크를 건너뛰기
  const headersList = headers();
  const pathnameHeader = headersList.get('x-pathname') || '';

  if (pathnameHeader === '/admin/login') {
    return <>{children}</>;
  }

  let user = null;
  let supabase: any = null;

  try {
    const cookieStore = cookies();
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              return cookieStore.getAll();
            } catch (error) {
              console.warn('Error getting cookies:', error);
              return [];
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              console.warn('Error setting cookies:', error);
            }
          },
        },
      }
    );

    try {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
    } catch (error: any) {
      if (error?.message?.includes('cookie') || error?.message?.includes('JSON') || error?.message?.includes('base64') || error?.message?.includes('parse')) {
        console.warn('Cookie parsing error (non-critical):', error.message);
        user = null;
      } else {
        console.error('Unexpected error getting user:', error);
        user = null;
      }
    }
  } catch (error: any) {
    console.error('Error initializing Supabase client:', error);
    redirect('/admin-login');
  }

  if (!user || !supabase) {
    redirect('/admin-login');
  }

  // Check if user is admin
  let userData = null;
  let userError = null;

  try {
    const result = await supabase
      .from('users')
      .select('role, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    userData = result.data;
    userError = result.error;
  } catch (error: any) {
    console.error('Error querying users table:', error);
    userError = error;
  }

  if (userError || !userData || (!userData.is_admin && userData.role !== 'admin')) {
    console.log('Admin layout check failed:', {
      userError: userError?.message,
      userData,
      is_admin: userData?.is_admin,
      role: userData?.role
    });
    redirect('/admin-login');
  }

  const navigationItems = [
    { href: '/admin', label: '대시보드', icon: 'Home' as const },
    { href: '/admin/users', label: '사용자', icon: 'Users' as const },
    { href: '/admin/invitations', label: '초대 관리', icon: 'Mail' as const },
    { href: '/admin/campaigns', label: '캠페인', icon: 'Briefcase' as const },
    { href: '/admin/proposals', label: '제안서', icon: 'FileText' as const },
    { href: '/admin/logs', label: '활동 로그', icon: 'ClipboardList' as const },
    { href: '/admin/analytics', label: '분석', icon: 'BarChart3' as const },
    { href: '/admin/settings', label: '설정', icon: 'Settings' as const },
  ];

  return (
    <AdminLayoutClient navigationItems={navigationItems}>
      {children}
    </AdminLayoutClient>
  );
}
