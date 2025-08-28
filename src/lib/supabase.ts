import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
}

export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'x-client-info': 'startup-matching@1.0.0'
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
      // users 테이블에 레코드 생성/업데이트
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          phone: metadata?.phone
        }, { onConflict: 'id' })
      
      if (userError && !userError.message.includes('duplicate')) {
        console.error('Error creating user record:', userError)
      }
      
      // 프로필 테이블에도 레코드 생성
      if (role === 'expert') {
        const { error: profileError } = await supabase
          .from('expert_profiles')
          .upsert({
            user_id: data.user.id,
            name: metadata?.name || '',
            email: data.user.email,
            is_profile_complete: false
          }, { onConflict: 'user_id' })
        
        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Error creating expert profile:', profileError)
        }
      } else if (role === 'organization') {
        const { error: profileError } = await supabase
          .from('organization_profiles')
          .upsert({
            user_id: data.user.id,
            name: metadata?.organizationName || '',
            email: data.user.email,
            organization_name: metadata?.organizationName || '',
            business_number: metadata?.businessNumber,
            representative_name: metadata?.representativeName || '',
            contact_position: metadata?.contactPosition,
            is_profile_complete: false
          }, { onConflict: 'user_id' })
        
        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Error creating organization profile:', profileError)
        }
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

    async getByExpert(expertId: string) {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          campaigns(
            *,
            organization_profiles(*)
          )
        `)
        .eq('expert_id', expertId)
        .order('submitted_at', { ascending: false })
      
      return { data, error }
    },

    async getByOrganization(organizationId: string) {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          campaigns!inner(
            *,
            organization_profiles!inner(*)
          ),
          expert_profiles(
            *,
            users(*)
          )
        `)
        .eq('campaigns.organization_id', organizationId)
        .order('submitted_at', { ascending: false })
      
      return { data, error }
    },

    async updateStatus(proposalId: string, status: string, responseMessage?: string) {
      const { data, error } = await supabase
        .from('proposals')
        .update({ 
          status, 
          response_message: responseMessage || null,
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', proposalId)
        .select()
        .single()
      
      return { data, error }
    },

    async getById(proposalId: string) {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          campaigns(
            *,
            organization_profiles(*)
          ),
          expert_profiles(
            *,
            users(*)
          )
        `)
        .eq('id', proposalId)
        .single()
      
      return { data, error }
    },
  },

  // Message operations
  messages: {
    async send(campaignId: string, proposalId: string | null, senderId: string, receiverId: string, content: string, messageType: string = 'text') {
      const { data, error } = await supabase.rpc('send_message', {
        p_campaign_id: campaignId,
        p_proposal_id: proposalId,
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_content: content,
        p_message_type: messageType
      })
      
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

    async getThreads(userId: string) {
      const { data, error } = await supabase
        .from('message_thread_view')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false })
      
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