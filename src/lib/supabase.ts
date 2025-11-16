import { browserSupabase } from './supabase-client'
import { Database } from '@/types/supabase'
import { handleSupabaseError } from './error-handler'

// Re-export browserSupabase as supabase for backward compatibility
export const supabase = browserSupabase

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
      try {
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
          handleSupabaseError(userError, false, { context: 'create_user_record' })
        }
      } catch (userErr) {
        handleSupabaseError(userErr as Error, false, { context: 'create_user_record_catch' })
      }
      
      // 프로필 테이블에도 레코드 생성 (스키마 컬럼에 맞게 최소 필드만 입력)
      try {
        if (role === 'expert') {
          const { error: profileError } = await supabase
            .from('expert_profiles')
            .upsert({
              user_id: data.user.id,
              name: metadata?.name || '',
              is_profile_complete: false
            }, { onConflict: 'user_id' })
          
          if (profileError && !profileError.message.includes('duplicate')) {
            handleSupabaseError(profileError, false, { context: 'create_expert_profile' })
          }
        } else if (role === 'organization') {
          const { error: profileError } = await supabase
            .from('organization_profiles')
            .upsert({
              user_id: data.user.id,
              organization_name: metadata?.organizationName || '',
              business_number: metadata?.businessNumber,
              representative_name: metadata?.representativeName || '',
              contact_position: metadata?.contactPosition,
              is_profile_complete: false
            }, { onConflict: 'user_id' })

          if (profileError && !profileError.message.includes('duplicate')) {
            handleSupabaseError(profileError, false, { context: 'create_organization_profile' })
          }
        }
      } catch (profileErr) {
        handleSupabaseError(profileErr as Error, false, { context: 'create_profile_catch' })
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
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting user:', error)
        return null
      }
      return user
    } catch (err) {
      console.error('Exception getting user:', err)
      return null
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
        return null
      }
      return session
    } catch (err) {
      console.error('Exception getting session:', err)
      return null
    }
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

      if (error) {
        // PGRST116 means no rows found - this is expected for new users
        if (error.code === 'PGRST116') {
          return { data: null, error: null }
        }

        // RLS policy errors should fail, not fallback
        // This prevents unauthorized access by enforcing database security policies
        if (error.message?.includes('policy') || error.message?.includes('permission')) {
          return {
            data: null,
            error: new Error('Insufficient permissions to access user profile')
          }
        }

        // Other errors should be returned as-is
        return { data: null, error }
      }

      return { data, error }
    },
  },

  // Expert operations
  experts: {
    async getProfile(userId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*, expert_profiles(*), organization_profiles(*)')
        .eq('id', userId)
        .single()

      if (error) {
        // PGRST116 means no rows found - this is expected for new users
        if (error.code === 'PGRST116') {
          return { data: null, error: null }
        }

        // RLS policy errors should fail, not fallback
        if (error.message?.includes('policy') || error.message?.includes('permission')) {
          return {
            data: null,
            error: new Error('Insufficient permissions to access expert profile')
          }
        }

        return { data: null, error }
      }

      return { data, error }
    },

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
          ),
          campaigns(
            title,
            id
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
    async send(campaignId: string, proposalId: string | null, senderId: string, receiverId: string, content: string, messageType: string = 'text', fileUrl?: string, fileName?: string, fileSize?: number) {
      const { data, error } = await supabase.rpc('send_message', {
        p_campaign_id: campaignId,
        p_proposal_id: proposalId,
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_content: content,
        p_message_type: messageType
      })
      
      // If file is provided, update the message with file info
      if (!error && data && (fileUrl || fileName)) {
        await supabase
          .from('messages')
          .update({
            file_url: fileUrl || null,
            file_name: fileName || null,
            file_size: fileSize || null
          })
          .eq('id', data)
      }
      
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

    async search(campaignId: string, userId: string, searchTerm: string) {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*)
        `)
        .eq('campaign_id', campaignId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
      
      return { data, error }
    },

    async update(messageId: string, content: string) {
      const { data, error } = await supabase
        .from('messages')
        .update({ 
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single()
      
      return { data, error }
    },

    async delete(messageId: string) {
      const { data, error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
      
      return { data, error }
    },

    async getThreads(userId: string) {
      const { data, error } = await supabase
        .from('message_thread_view')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false })
      
      if (error || !data) {
        return { data, error }
      }

      // Calculate unread_count for each thread
      const threadsWithUnread = await Promise.all(
        data.map(async (thread: any) => {
          // Count unread messages for this thread where current user is receiver
          let query = supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('is_read', false)
            .in('sender_id', [thread.participant_1, thread.participant_2])

          // Add campaign_id filter if it exists
          if (thread.campaign_id) {
            query = query.eq('campaign_id', thread.campaign_id)
          } else {
            query = query.is('campaign_id', null)
          }

          const { count } = await query

          return {
            ...thread,
            unread_count: count || 0
          }
        })
      )

      return { data: threadsWithUnread, error: null }
    },

    async markAsRead(messageIds: string[]) {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', messageIds)
      
      return { data, error }
    },

    async markAllAsRead(campaignId: string, userId: string) {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('receiver_id', userId)
        .eq('is_read', false)
      
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

  // Task management operations
  tasks: {
    // Create a new task
    async create(task: {
      title: string
      description?: string
      status?: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      assignee_id?: string
      organization_id?: string
      campaign_id?: string
      expert_id?: string
      due_date?: string
      estimated_hours?: number
      metadata?: any
    }) {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // 빈 문자열을 undefined로 변환하여 UUID 필드 오류 방지
      const cleanTask: any = {
        title: task.title,
        creator_id: user.id,
        updated_by: user.id
      }

      // 선택적 필드 추가 (빈 문자열이 아닌 경우만)
      if (task.description && task.description.trim()) {
        cleanTask.description = task.description.trim()
      }
      if (task.status) {
        cleanTask.status = task.status
      }
      if (task.priority) {
        cleanTask.priority = task.priority
      }
      
      // UUID 필드들은 빈 문자열이 아닌 경우에만 추가
      const assigneeId = task.assignee_id?.trim()
      if (assigneeId && assigneeId !== '') {
        cleanTask.assignee_id = assigneeId
      }
      
      const orgId = task.organization_id?.trim()
      if (orgId && orgId !== '') {
        cleanTask.organization_id = orgId
      }
      
      const campId = task.campaign_id?.trim()
      if (campId && campId !== '') {
        cleanTask.campaign_id = campId
      }
      
      const expId = task.expert_id?.trim()
      if (expId && expId !== '') {
        cleanTask.expert_id = expId
      }
      
      const dueDate = task.due_date?.trim()
      if (dueDate && dueDate !== '') {
        cleanTask.due_date = dueDate
      }
      
      if (task.estimated_hours !== undefined && task.estimated_hours !== null) {
        cleanTask.estimated_hours = task.estimated_hours
      }
      
      if (task.metadata) {
        cleanTask.metadata = task.metadata
      }
      
      // 최종 검증: UUID 필드에 빈 문자열이 있는지 확인
      const uuidFields = ['assignee_id', 'organization_id', 'campaign_id', 'expert_id']
      uuidFields.forEach(field => {
        if (cleanTask[field] === '' || cleanTask[field] === null) {
          delete cleanTask[field]
        }
      })

      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTask)
        .select()
        .single()
      
      return { data, error }
    },

    // Get all tasks with filters
    async list(filters?: {
      status?: string
      priority?: string
      assignee_id?: string
      organization_id?: string
      campaign_id?: string
      search?: string
      due_date_from?: string
      due_date_to?: string
      is_archived?: boolean
    }) {
      // 먼저 tasks만 조회 (categories는 별도로 조회)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          creator:users!tasks_creator_id_fkey(id, email, role),
          assignee:users!tasks_assignee_id_fkey(id, email, role),
          comments:task_comments(count)
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id)
      }
      if (filters?.organization_id) {
        query = query.eq('organization_id', filters.organization_id)
      }
      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id)
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from)
      }
      if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to)
      }
      if (filters?.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived)
      }

      const { data: tasksData, error } = await query
      
      if (error) {
        return { data: null, error }
      }

      // Categories 조회는 선택적으로 처리 (에러가 발생해도 tasks는 반환)
      // 필요시 클라이언트에서 별도로 조회하도록 함
      if (tasksData && tasksData.length > 0) {
        const enrichedTasks = tasksData.map((task: any) => ({
          ...task,
          task_category_relations: [],
          categories: []
        }))

        return { data: enrichedTasks, error: null }
      }

      return { data: tasksData || [], error: null }
    },

    // Get single task by ID
    async get(taskId: string) {
      // 먼저 task 기본 정보 조회
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:users!tasks_creator_id_fkey(id, email, role),
          assignee:users!tasks_assignee_id_fkey(id, email, role),
          comments:task_comments(*),
          activity_logs:task_activity_logs(
            *,
            user:users(id, email)
          ),
          attachments:task_attachments(*)
        `)
        .eq('id', taskId)
        .single()
      
      if (taskError || !taskData) {
        return { data: null, error: taskError }
      }

      // Categories 조회는 선택적으로 처리 (에러가 발생해도 task는 반환)
      // 필요시 클라이언트에서 별도로 조회하도록 함
      return {
        data: {
          ...taskData,
          task_category_relations: [],
          categories: []
        },
        error: null
      }
    },

    // Update task
    async update(taskId: string, updates: any) {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_by: user.id
        })
        .eq('id', taskId)
        .select()
        .single()
      
      return { data, error }
    },

    // Update task status
    async updateStatus(taskId: string, status: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold') {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updates: any = {
        status,
        updated_by: user.id
      }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()
      
      return { data, error }
    },

    // Delete task
    async delete(taskId: string) {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      
      return { data, error }
    },

    // Archive task
    async archive(taskId: string) {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_archived: true,
          updated_by: user.id
        })
        .eq('id', taskId)
        .select()
        .single()
      
      return { data, error }
    },

    // Bulk update tasks
    async bulkUpdate(taskIds: string[], updates: any) {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_by: user.id
        })
        .in('id', taskIds)
        .select()
      
      return { data, error }
    },

    // Bulk delete tasks
    async bulkDelete(taskIds: string[]) {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
      
      return { data, error }
    },

    // Add comment to task
    async addComment(taskId: string, content: string) {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content
        })
        .select()
        .single()
      
      return { data, error }
    },

    // Get task statistics
    async getStatistics(organizationId?: string) {
      let query = supabase
        .from('task_statistics')
        .select('*')
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.single()
      return { data, error }
    },

    // Get user task assignments
    async getUserAssignments(userId?: string) {
      let query = supabase
        .from('user_task_assignments')
        .select('*')
      
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      return { data, error }
    },

    // Search tasks
    async search(searchTerm: string, filters?: any) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(20)
      
      return { data, error }
    }
  },

  // Task categories operations
  taskCategories: {
    async create(category: {
      name: string
      color?: string
      description?: string
      organization_id?: string
    }) {
      const { data, error } = await supabase
        .from('task_categories')
        .insert(category)
        .select()
        .single()
      
      return { data, error }
    },

    async list(organizationId?: string) {
      let query = supabase
        .from('task_categories')
        .select('*')
        .order('name')
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
      return { data, error }
    },

    async update(categoryId: string, updates: any) {
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single()
      
      return { data, error }
    },

    async delete(categoryId: string) {
      const { data, error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', categoryId)
      
      return { data, error }
    },

    async assignToTask(taskId: string, categoryIds: string[]) {
      // First remove existing categories
      await supabase
        .from('task_category_relations')
        .delete()
        .eq('task_id', taskId)

      // Then add new ones
      if (categoryIds.length > 0) {
        const relations = categoryIds.map(categoryId => ({
          task_id: taskId,
          category_id: categoryId
        }))

        const { data, error } = await supabase
          .from('task_category_relations')
          .insert(relations)
        
        return { data, error }
      }

      return { data: [], error: null }
    }
  },

  // Task reminders operations
  taskReminders: {
    async create(reminder: {
      task_id: string
      remind_at: string
    }) {
      const user = await auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('task_reminders')
        .insert({
          ...reminder,
          user_id: user.id
        })
        .select()
        .single()
      
      return { data, error }
    },

    async getUpcoming(userId?: string) {
      let query = supabase
        .from('task_reminders')
        .select(`
          *,
          task:tasks(*)
        `)
        .eq('is_sent', false)
        .gte('remind_at', new Date().toISOString())
        .order('remind_at', { ascending: true })
      
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      return { data, error }
    },

    async markAsSent(reminderId: string) {
      const { data, error } = await supabase
        .from('task_reminders')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', reminderId)
        .select()
        .single()
      
      return { data, error }
    }
  }
}
