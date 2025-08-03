import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Helper functions for common operations
export const auth = {
  // Sign up with role
  async signUp(email: string, password: string, role: 'expert' | 'organization', metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          ...metadata,
        },
      },
    })

    // Trigger가 작동하지 않을 경우를 대비해 직접 users 테이블에 추가
    if (data?.user && !error) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          phone: metadata?.phone
        })
        .select()
        .single()
      
      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Error creating user record:', insertError)
      }
    }

    return { data, error }
  },

  // Sign in
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  },

  // Sign out
  async signOut() {
    return await supabase.auth.signOut()
  },

  // Get current user
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },
}

// Database helper functions
export const db = {
  // User operations
  users: {
    async getProfile(userId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*, expert_profiles(*), organization_profiles(*)')
        .eq('id', userId)
        .single()
      
      return { data, error }
    },
  },

  // Expert operations
  experts: {
    async search(keywords: string[], location?: string) {
      let query = supabase
        .from('expert_search_view')
        .select('*')
      
      if (keywords.length > 0) {
        query = query.contains('hashtags', keywords)
      }
      
      if (location) {
        query = query.contains('service_regions', [location])
      }
      
      const { data, error } = await query
      return { data, error }
    },

    async updateProfile(expertId: string, updates: any) {
      const { data, error } = await supabase
        .from('expert_profiles')
        .update(updates)
        .eq('id', expertId)
        .select()
        .single()
      
      return { data, error }
    },

    async updateHashtags(expertId: string) {
      const { data, error } = await supabase
        .rpc('update_expert_hashtags', { p_expert_id: expertId })
      
      return { data, error }
    },
  },

  // Campaign operations
  campaigns: {
    async create(campaign: any) {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single()
      
      return { data, error }
    },

    async list(filters?: { status?: string; category?: string }) {
      let query = supabase
        .from('campaign_list_view')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters?.category) {
        query = query.eq('category_slug', filters.category)
      }
      
      const { data, error } = await query
      return { data, error }
    },

    async get(campaignId: string) {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          categories(*),
          organization_profiles(*)
        `)
        .eq('id', campaignId)
        .single()
      
      return { data, error }
    },

    async update(campaignId: string, updates: any) {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single()
      
      return { data, error }
    },

    async matchExperts(campaignId: string, stage = 1, limit = 20) {
      const { data, error } = await supabase
        .rpc('match_campaign_experts', {
          p_campaign_id: campaignId,
          p_stage: stage,
          p_limit: limit,
        })
      
      return { data, error }
    },
  },

  // Proposal operations
  proposals: {
    async submit(proposal: any) {
      const { data, error } = await supabase
        .from('proposals')
        .insert(proposal)
        .select()
        .single()
      
      return { data, error }
    },

    async getByCampaign(campaignId: string) {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          expert_profiles(
            *,
            users(*)
          )
        `)
        .eq('campaign_id', campaignId)
        .order('submitted_at', { ascending: false })
      
      return { data, error }
    },

    async updateStatus(proposalId: string, status: string) {
      const { data, error } = await supabase
        .from('proposals')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', proposalId)
        .select()
        .single()
      
      return { data, error }
    },
  },

  // Message operations
  messages: {
    async send(message: any) {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single()
      
      return { data, error }
    },

    async getByCampaign(campaignId: string, userId: string) {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .eq('campaign_id', campaignId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true })
      
      return { data, error }
    },

    async markAsRead(messageIds: string[]) {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', messageIds)
      
      return { data, error }
    },
  },

  // Notification operations
  notifications: {
    async getUnread(userId: string) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
      
      return { data, error }
    },

    async markAsRead(notificationIds: string[]) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
      
      return { data, error }
    },
  },

  // Category operations
  categories: {
    async list() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      return { data, error }
    },
  },

  // Organization operations
  organizations: {
    async updateProfile(organizationId: string, updates: any) {
      const { data, error } = await supabase
        .from('organization_profiles')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single()
      
      return { data, error }
    },
  },
}