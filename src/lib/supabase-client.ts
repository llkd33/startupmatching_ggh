import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client with proper headers
export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'x-client-info': 'startup-matching@1.0.0',
        'apikey': supabaseAnonKey
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

export const browserSupabase = typeof window !== 'undefined' 
  ? createBrowserSupabaseClient() 
  : createClient<Database>(buildUrl, buildKey, {
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