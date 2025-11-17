import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client - cookie-based for SSR compatibility
export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // Use document.cookie for SSR compatibility with middleware
  const cookieStorage = {
    getItem: (key: string) => {
      if (typeof document === 'undefined') return null
      const cookies = document.cookie.split('; ')
      const cookie = cookies.find(c => c.startsWith(`${key}=`))
      return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
    },
    setItem: (key: string, value: string) => {
      if (typeof document === 'undefined') return
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') return
      document.cookie = `${key}=; path=/; max-age=0`
    }
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: cookieStorage,
      storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'x-client-info': 'startup-matching@1.0.0',
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}

// Export a singleton instance for client-side use
const buildUrl = supabaseUrl || 'https://placeholder.supabase.co'
const buildKey = supabaseAnonKey || 'placeholder-key'

type SupabaseBrowserClient = SupabaseClient<Database>

const globalForSupabase = globalThis as typeof globalThis & {
  __browserSupabase?: SupabaseBrowserClient
}

let client: SupabaseBrowserClient

if (typeof window !== 'undefined') {
  // Client-side: 환경 변수 확인 후 클라이언트 생성
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: supabaseUrl ? 'set' : 'missing',
      key: supabaseAnonKey ? 'set' : 'missing'
    })
    // 개발 환경에서는 경고만, 프로덕션에서는 에러
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing Supabase environment variables')
    }
  }
  
  if (!globalForSupabase.__browserSupabase) {
    try {
      globalForSupabase.__browserSupabase = createBrowserSupabaseClient()
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
      // Fallback: placeholder 클라이언트 생성 (에러 방지)
      globalForSupabase.__browserSupabase = createClient<Database>(buildUrl, buildKey, {
        auth: { persistSession: false }
      })
    }
  }
  client = globalForSupabase.__browserSupabase
  ;(window as any).browserSupabase = client
} else {
  // Server-side: placeholder 클라이언트
  client = createClient<Database>(buildUrl, buildKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'x-client-info': 'startup-matching@1.0.0',
        'apikey': buildKey
      }
    }
  })
}

export const browserSupabase = client
