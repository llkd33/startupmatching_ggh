'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { browserSupabase } from '@/lib/supabase-client'
import { UserRole } from '@/types/supabase'
import { handleSupabaseError } from '@/lib/error-handler'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UserRole | null
  loading: boolean
  isExpert: boolean
  isOrganization: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, role: UserRole, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  // Prevent race conditions with ref to track in-flight requests
  const roleUpdateInProgress = useRef(false)
  const mountedRef = useRef(true)

  const ensureUserRecord = async (supabaseUser: User): Promise<UserRole> => {
    const metadataRole = supabaseUser.user_metadata?.role as UserRole | undefined
    const fallbackRole: UserRole = metadataRole ?? 'organization'

    try {
      const { error: upsertError } = await browserSupabase
        .from('users')
        .upsert(
          {
            id: supabaseUser.id,
            email: supabaseUser.email ?? '',
            role: fallbackRole,
            phone: supabaseUser.user_metadata?.phone ?? null,
          },
          { onConflict: 'id' }
        )

      if (upsertError) {
        handleSupabaseError(upsertError, false, { context: 'ensure_user_record' })
      }

      return fallbackRole
    } catch (error) {
      handleSupabaseError(error as Error, false, { context: 'ensure_user_record_catch' })
      return fallbackRole
    }
  }

  const fetchAndSetRole = async (userId: string, metaRole?: UserRole) => {
    // Prevent concurrent role updates
    if (roleUpdateInProgress.current) {
      return
    }

    roleUpdateInProgress.current = true

    try {
      // Set metadata role immediately for fast UI updates
      if (metaRole && mountedRef.current) {
        setRole(metaRole)
      }

      // Fetch role from database
      const { data: userRow, error: roleError } = await browserSupabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (!mountedRef.current) return

      if (roleError) {
        // Only log errors that aren't "no rows found"
        if (roleError.code !== 'PGRST116' && !roleError.message?.includes('406')) {
          handleSupabaseError(roleError, false, { context: 'fetch_role' })
        }

        // Ensure user record exists
        const user = await browserSupabase.auth.getUser()
        if (user.data.user) {
          const ensuredRole = await ensureUserRecord(user.data.user)
          if (mountedRef.current) {
            setRole(ensuredRole)
          }
        } else if (metaRole && mountedRef.current) {
          // Fallback to metadata role if we can't get user
          setRole(metaRole)
        }
      } else if (userRow?.role) {
        // Update with database role if different from metadata
        if (mountedRef.current) {
          setRole(userRow.role)
        }
      } else {
        // No row found - ensure user record exists and use metadata as fallback
        const user = await browserSupabase.auth.getUser()
        if (user.data.user) {
          const ensuredRole = await ensureUserRecord(user.data.user)
          if (mountedRef.current) {
            setRole(ensuredRole)
          }
        } else if (metaRole && mountedRef.current) {
          // Fallback to metadata role
          setRole(metaRole)
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        handleSupabaseError(error as Error, false, { context: 'fetch_and_set_role' })
        // Keep metadata role as fallback
        if (metaRole) {
          setRole(metaRole)
        }
      }
    } finally {
      roleUpdateInProgress.current = false
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // Initial session load
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await browserSupabase.auth.getSession()

        if (!mountedRef.current) return

        if (!session?.user) {
          setSession(null)
          setUser(null)
          setRole(null)
          setLoading(false)
          return
        }

        // Set session and user immediately
        setSession(session)
        setUser(session.user)

        // Fetch and set role
        const metaRole = session.user.user_metadata?.role as UserRole | undefined
        await fetchAndSetRole(session.user.id, metaRole)
      } catch (error) {
        if (mountedRef.current) {
          handleSupabaseError(error as Error, true, { context: 'auth_initialization' })
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Auth state change listener
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      setSession(session ?? null)
      setUser(session?.user ?? null)

      if (session?.user) {
        const metaRole = session.user.user_metadata?.role as UserRole | undefined
        await fetchAndSetRole(session.user.id, metaRole)
      } else {
        setRole(null)
      }

      // Update loading state for sign in/out events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, role: UserRole, metadata?: any) => {
    try {
      const { data, error } = await browserSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            ...metadata,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        handleSupabaseError(error, true, { context: 'sign_up' })
        return { data, error }
      }

      // Ensure users table record exists
      if (data?.user) {
        await browserSupabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            role,
            phone: metadata?.phone ?? null,
          }, { onConflict: 'id' })
      }

      return { data, error }
    } catch (error) {
      handleSupabaseError(error as Error, true, { context: 'sign_up_catch' })
      return { data: null, error: error as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await browserSupabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        handleSupabaseError(error, true, { context: 'sign_in' })
      }

      return { data, error }
    } catch (error) {
      handleSupabaseError(error as Error, true, { context: 'sign_in_catch' })
      return { data: null, error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      // 세션 스토리지 정리
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('current_role')
        if (process.env.NODE_ENV === 'development') {
          console.log('Clearing session storage')
        }
      }

      // Supabase 로그아웃
      const { error } = await browserSupabase.auth.signOut()
      
      if (error) {
        handleSupabaseError(error as Error, true, { context: 'sign_out' })
        throw error
      }

      // 상태 초기화
      setUser(null)
      setSession(null)
      setRole(null)

      if (process.env.NODE_ENV === 'development') {
        console.log('Sign out successful')
      }

      // 페이지 리다이렉트 (클라이언트 사이드에서만)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      handleSupabaseError(error as Error, true, { context: 'sign_out' })
      // 에러가 발생해도 강제 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await browserSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        handleSupabaseError(error, true, { context: 'reset_password' })
      }

      return { data, error }
    } catch (error) {
      handleSupabaseError(error as Error, true, { context: 'reset_password_catch' })
      return { data: null, error: error as Error }
    }
  }

  const isExpert = role === 'expert'
  const isOrganization = role === 'organization'
  const isAuthenticated = !!user

  const value = {
    user,
    session,
    role,
    loading,
    isExpert,
    isOrganization,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
