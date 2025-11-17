import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // pathname을 헤더에 추가하여 layout에서 사용할 수 있도록 함
  response.headers.set('x-pathname', pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session for all routes to ensure cookies are up to date
  // This is important for server components to read the session correctly
  try {
    await supabase.auth.getUser();
  } catch (error: any) {
    // Ignore cookie parsing errors - they're non-critical
    if (error?.message?.includes('cookie') || error?.message?.includes('JSON') || error?.message?.includes('base64')) {
      // Cookie parsing errors are non-critical, continue
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  // Check if the route is an admin route (but exclude /admin-login)
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
    let user = null;
    let authError = null;
    
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      authError = result.error;
    } catch (error: any) {
      // Ignore cookie parsing errors - they're non-critical
      if (error?.message?.includes('cookie') || error?.message?.includes('JSON') || error?.message?.includes('base64')) {
        // Cookie parsing errors are non-critical, treat as no user
        authError = { message: 'Cookie parsing error' };
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // If no user, redirect to admin login page
    if (authError || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Admin middleware: No user found', {
          authError: authError?.message,
          pathname
        })
      }
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Admin middleware: User found', {
        userId: user.id,
        email: user.email,
        pathname
      })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, is_admin')
      .eq('id', user.id)
      .maybeSingle(); // single() 대신 maybeSingle() 사용

    // Always log for debugging (production too)
    console.log('🔍 Admin middleware check:', {
      userId: user.id,
      email: user.email,
      userError: userError?.message || null,
      userData: userData || null,
      is_admin: userData?.is_admin || null,
      role: userData?.role || null,
      timestamp: new Date().toISOString()
    })

    // users 테이블에 레코드가 없거나 관리자가 아닌 경우
    if (userError || !userData || (!userData.is_admin && userData.role !== 'admin')) {
      console.log('❌ Admin middleware: Access denied', {
        reason: userError ? 'database_error' : !userData ? 'user_not_found' : 'not_admin',
        userError: userError?.message,
        userData,
        userId: user.id
      })
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    console.log('✅ Admin middleware: Access granted', {
      userId: user.id,
      email: user.email,
      is_admin: userData.is_admin,
      role: userData.role,
      timestamp: new Date().toISOString()
    })
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
