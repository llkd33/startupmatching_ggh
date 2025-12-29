import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Production-safe logging (only logs in development)
const isDev = process.env.NODE_ENV === 'development';
const log = {
  warn: (msg: string, ctx?: unknown) => isDev && console.warn(`[middleware] ${msg}`, ctx || ''),
  error: (msg: string, ctx?: unknown) => isDev && console.error(`[middleware] ${msg}`, ctx || ''),
};

// 간단한 메모리 캐시 (프로덕션에서는 Redis 사용 권장)
interface CacheEntry {
  isAdmin: boolean;
  timestamp: number;
}

const adminCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 1분 캐시

// 주기적으로 만료된 캐시 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of adminCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      adminCache.delete(key);
    }
  }
}, CACHE_TTL); // 1분마다 정리

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
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
    } catch (error: unknown) {
      // Cookie parsing 에러는 무시 (비중요)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('cookie') ||
        errorMessage.includes('JSON') ||
        errorMessage.includes('base64') ||
        errorMessage.includes('parse') ||
        errorMessage.includes('Unexpected token')) {
        log.warn('Cookie parsing error (non-critical)', errorMessage);
      } else {
        log.error('Admin auth error', error);
      }
    }

    if (!user || authError) {
      // 인증되지 않은 경우 admin 로그인으로 리다이렉트
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin-login';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // 캐시 확인
    const cachedEntry = adminCache.get(user.id);
    const now = Date.now();

    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_TTL) {
      // 캐시가 유효한 경우
      if (!cachedEntry.isAdmin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl);
      }
      // 관리자인 경우 통과
    } else {
      // 캐시가 없거나 만료된 경우 DB 조회
      try {
        const { data: userData, error: userProfileError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (userProfileError || !userData?.is_admin) {
          // 캐시 업데이트 (관리자 아님)
          adminCache.set(user.id, { isAdmin: false, timestamp: now });

          // 관리자가 아닌 경우 홈으로 리다이렉트
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/';
          return NextResponse.redirect(redirectUrl);
        }

        // 캐시 업데이트 (관리자)
        adminCache.set(user.id, { isAdmin: true, timestamp: now });
      } catch (error) {
        log.error('Error checking admin role', error);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/admin-login';
        redirectUrl.searchParams.set('redirectedFrom', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    // API 라우트에서 재사용할 수 있도록 헤더에 사용자 정보 추가
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-email', user.email || '');
    response.headers.set('x-is-admin', 'true');
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
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
    } catch (error: unknown) {
      // Cookie parsing 에러는 무시
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('cookie') &&
        !errorMessage.includes('JSON') &&
        !errorMessage.includes('base64') &&
        !errorMessage.includes('parse') &&
        !errorMessage.includes('Unexpected token')) {
        log.error('Auth check error', error);
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
