import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

// Create a Supabase client bound to server-side cookies
export function getServerSupabase() {
  return createServerComponentClient({ cookies })
}

export async function checkAdminAuth() {
  const supabase = getServerSupabase()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()
  
  if (userError || (!userData?.is_admin && userData?.role !== 'admin')) {
    redirect('/unauthorized')
  }
  
  return user
}

export async function getAdminStats() {
  const supabase = getServerSupabase()
  const { data: stats, error } = await supabase
    .from('admin_statistics')
    .select('*')
    .single()
  
  if (error) {
    console.error('Error fetching admin stats:', error)
    return null
  }
  
  return stats
}

export async function logAdminAction(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: any
) {
  const supabase = getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return
  
  await supabase
    .from('admin_logs')
    .insert({
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    })
}
