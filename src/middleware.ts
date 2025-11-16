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
  await supabase.auth.getUser();

  // Check if the route is an admin route (but exclude /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If no user, redirect to admin login page
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (!userData || (!userData.is_admin && userData.role !== 'admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
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
