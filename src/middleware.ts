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

  // Admin 경로에서만 인증 및 권한 확인 수행
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
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

    // auth.getUser()를 한 번만 호출하여 세션 확인 및 사용자 정보 가져오기
    let user = null;
    let authError = null;

    try {
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    } catch (error: any) {
      // Cookie parsing 에러는 무시 (비중요)
      if (error?.message?.includes('cookie') || 
          error?.message?.includes('JSON') || 
          error?.message?.includes('base64') ||
          error?.message?.includes('parse') ||
          error?.message?.includes('Unexpected token')) {
        console.warn('Cookie parsing error (non-critical):', error?.message);
      } else {
        console.error('Middleware admin auth error:', error);
      }
    }

    if (!user || authError) {
      // 인증되지 않은 경우 admin 로그인으로 리다이렉트
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin-login';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // 관리자 권한 확인 (DB 조회)
    try {
      const { data: userData, error: userProfileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (userProfileError || !userData?.is_admin) {
        // 관리자가 아닌 경우 홈으로 리다이렉트
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Error checking admin role in middleware:', error);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin-login';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 일반 사용자 인증 확인은 필요한 경로에서만 수행 (예: /auth/login, /auth/signup)
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) {
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      // 이미 로그인한 사용자는 대시보드로 리다이렉트
      if (user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error: any) {
      // Cookie parsing 에러는 무시
      if (!error?.message?.includes('cookie') && 
          !error?.message?.includes('JSON') && 
          !error?.message?.includes('base64') &&
          !error?.message?.includes('parse') &&
          !error?.message?.includes('Unexpected token')) {
        console.error('Auth check error:', error);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Admin 경로와 인증 관련 경로만 매칭하여 성능 최적화
     * - /admin/*: 관리자 경로 (인증 및 권한 확인)
     * - /auth/login, /auth/signup: 로그인/회원가입 경로 (이미 로그인한 사용자 리다이렉트)
     */
    '/admin/:path*',
    '/auth/login',
    '/auth/signup',
  ],
};
