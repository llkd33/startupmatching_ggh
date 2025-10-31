'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/supabase'
import { browserSupabase } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { UserRole } from '@/types/supabase'

interface AuthUser extends User {
  role?: UserRole
  profile?: any
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          router.push('/auth/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const loadUser = async () => {
    try {
      setLoading(true)

      // First check if we have a session
      const session = await auth.getSession()
      if (!session) {
        console.log('No session found')
        setUser(null)
        setLoading(false)
        return
      }

      const currentUser = await auth.getUser()

      if (currentUser) {
        await loadUserProfile(currentUser)
      } else {
        console.log('No user found despite having session')
        setUser(null)
      }
    } catch (err) {
      console.error('Error loading user:', err)
      setError('Failed to load user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (user: User) => {
    try {
      const { data: profile } = await db.users.getProfile(user.id)
      
      if (profile) {
        const userProfile = profile.role === 'expert' 
          ? profile.expert_profiles?.[0] || profile.expert_profiles
          : profile.organization_profiles?.[0] || profile.organization_profiles
        
        setUser({
          ...user,
          role: profile.role,
          profile: userProfile,
        })
      } else {
        // If no profile exists yet, just set the user without profile
        setUser(user as AuthUser)
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
      setUser(user as AuthUser)
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    role: 'expert' | 'organization',
    metadata?: any
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await auth.signUp(email, password, role, metadata)
      
      if (error) throw error
      return { data, error: null }
    } catch (err: any) {
      setError(err.message)
      return { data: null, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await auth.signIn(email, password)
      
      if (error) throw error
      return { data, error: null }
    } catch (err: any) {
      setError(err.message)
      return { data: null, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setLoading(false)
    }
  }

  const isExpert = user?.role === 'expert'
  const isOrganization = user?.role === 'organization'
  const isAuthenticated = !!user

  return {
    user,
    loading,
    error,
    isExpert,
    isOrganization,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    refresh: loadUser,
  }
}