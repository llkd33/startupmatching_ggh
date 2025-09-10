'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { browserSupabase } from '@/lib/supabase-client'
import { UserRole } from '@/types/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UserRole | null
  loading: boolean
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
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // 초기 세션 로드 + 역할은 DB 기준으로 동기화
    const load = async () => {
      try {
        const { data: { session } } = await browserSupabase.auth.getSession()
        
        if (!session?.user) {
          setSession(null)
          setUser(null)
          setRole(null)
          setLoading(false)
          return
        }
        
        // 세션이 있으면 즉시 유저 설정 (빠른 UI 업데이트)
        setSession(session)
        setUser(session.user)
        
        // 메타데이터에서 역할 먼저 설정 (빠른 초기 로드)
        const metaRole = session.user.user_metadata?.role
        if (metaRole) {
          setRole(metaRole as UserRole)
        }
        
        // DB에서 역할 확인 (백그라운드에서)
        try {
          const { data: userRow, error: roleError } = await browserSupabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (!roleError && userRow?.role) {
            setRole(userRow.role)
          }
        } catch (err) {
          // DB 접근 실패 시 메타데이터 역할 유지
          console.log('Role fetch from DB failed, using metadata role')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setError(error as Error)
      } finally {
        setLoading(false)
      }
    }

    load()

    // 인증 변경 리스너
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (event, session) => {
      // 즉시 세션 업데이트
      setSession(session ?? null)
      setUser(session?.user ?? null)

      if (session?.user) {
        // 메타데이터에서 빠르게 역할 설정
        const metaRole = session.user.user_metadata?.role
        if (metaRole) {
          setRole(metaRole as UserRole)
        }
        
        // DB 확인은 비동기로
        browserSupabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: userRow, error }) => {
            if (!error && userRow?.role) {
              setRole(userRow.role)
            }
          })
          .catch(() => {
            // DB 접근 실패 시 메타데이터 역할 유지
            console.log('Role fetch from DB failed in auth state change')
          })
      } else {
        setRole(null)
      }
      
      // 로그인/로그아웃 이벤트에서만 로딩 상태 업데이트
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, role: UserRole, metadata?: any) => {
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

    // users 테이블 보정: 트리거 실패 등 대비
    if (data?.user && !error) {
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
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await browserSupabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    await browserSupabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await browserSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  }

  const value = {
    user,
    session,
    role,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  // Show error if there's an initialization error
  if (error) {
    console.error('Auth initialization error:', error)
    // Don't block the app, just log the error and continue
    // return (
    //   <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
    //     <h2>Auth Error:</h2>
    //     <pre>{error.message}</pre>
    //   </div>
    // )
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