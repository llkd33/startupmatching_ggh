import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function adminAuthMiddleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is authenticated
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if user is admin
  const { data: userData, error } = await supabase
    .from('users')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData || (!userData.is_admin && userData.role !== 'admin')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}
