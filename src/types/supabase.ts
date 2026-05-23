export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'expert' | 'organization' | 'admin'
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'expert' | 'organization' | 'admin'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'expert' | 'organization' | 'admin'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expert_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          career_history: Json
          education: Json
          skills: string[]
          service_regions: string[]
          portfolio_url: string | null
          bio: string | null
          hourly_rate: number | null
          is_available: boolean
          availability_schedule: Json | null
          rating: number
          total_projects: number
          created_at: string
          updated_at: string
          is_profile_complete: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          career_history?: Json
          education?: Json
          skills?: string[]
          service_regions?: string[]
          portfolio_url?: string | null
          bio?: string | null
          hourly_rate?: number | null
          is_available?: boolean
          availability_schedule?: Json | null
          rating?: number
          total_projects?: number
          created_at?: string
          updated_at?: string
          is_profile_complete?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          career_history?: Json
          education?: Json
          skills?: string[]
          service_regions?: string[]
          portfolio_url?: string | null
          bio?: string | null
          hourly_rate?: number | null
          is_available?: boolean
          availability_schedule?: Json | null
          rating?: number
          total_projects?: number
          created_at?: string
          updated_at?: string
          is_profile_complete?: boolean
        }
      }
      organization_profiles: {
        Row: {
          id: string
          user_id: string
          organization_name: string
          business_number: string | null
          representative_name: string
          contact_position: string | null
          industry: string | null
          employee_count: string | null
          website: string | null
          description: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
          is_profile_complete: boolean
        }
        Insert: {
          id?: string
          user_id: string
          organization_name: string
          business_number?: string | null
          representative_name: string
          contact_position?: string | null
          industry?: string | null
          employee_count?: string | null
          website?: string | null
          description?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
          is_profile_complete?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          organization_name?: string
          business_number?: string | null
          representative_name?: string
          contact_position?: string | null
          industry?: string | null
          employee_count?: string | null
          website?: string | null
          description?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
          is_profile_complete?: boolean
        }
      }
      campaigns: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string
          type: 'mentoring' | 'investment' | 'service'
          category: string
          keywords: string[]
          budget_min: number | null
          budget_max: number | null
          start_date: string | null
          end_date: string | null
          location: string | null
          required_experts: number
          status: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled'
          attachments: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description: string
          type: 'mentoring' | 'investment' | 'service'
          category: string
          keywords?: string[]
          budget_min?: number | null
          budget_max?: number | null
          start_date?: string | null
          end_date?: string | null
          location?: string | null
          required_experts?: number
          status?: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled'
          attachments?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string
          type?: 'mentoring' | 'investment' | 'service'
          category?: string
          keywords?: string[]
          budget_min?: number | null
          budget_max?: number | null
          start_date?: string | null
          end_date?: string | null
          location?: string | null
          required_experts?: number
          status?: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled'
          attachments?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          campaign_id: string
          expert_id: string
          proposal_text: string
          estimated_budget: number | null
          estimated_start_date: string | null
          estimated_end_date: string | null
          portfolio_links: string[] | null
          status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          response_message: string | null
          submitted_at: string
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          expert_id: string
          proposal_text: string
          estimated_budget?: number | null
          estimated_start_date?: string | null
          estimated_end_date?: string | null
          portfolio_links?: string[] | null
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          response_message?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          expert_id?: string
          proposal_text?: string
          estimated_budget?: number | null
          estimated_start_date?: string | null
          estimated_end_date?: string | null
          portfolio_links?: string[] | null
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          response_message?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          campaign_id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
          created_at: string
          message_type?: 'text' | 'image' | 'file'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
        }
        Insert: {
          id?: string
          campaign_id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          created_at?: string
          message_type?: 'text' | 'image' | 'file'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
        }
        Update: {
          id?: string
          campaign_id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
          message_type?: 'text' | 'image' | 'file'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'campaign_match' | 'proposal_received' | 'message' | 'system'
          title: string
          content: string
          is_read: boolean
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'campaign_match' | 'proposal_received' | 'message' | 'system'
          title: string
          content: string
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'campaign_match' | 'proposal_received' | 'message' | 'system'
          title?: string
          content?: string
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          target_type: 'campaign' | 'expert' | 'organization'
          target_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: 'campaign' | 'expert' | 'organization'
          target_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: 'campaign' | 'expert' | 'organization'
          target_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          email: string
          name: string | null
          phone: string | null
          role: 'expert' | 'organization' | 'admin' | null
          organization_name: string | null
          position: string | null
          status: 'pending' | 'accepted' | 'expired' | 'cancelled'
          expires_at: string
          accepted_at: string | null
        }[]
      }
      get_unread_notification_count: {
        Args: { user_uuid?: string }
        Returns: number
      }
      get_unread_message_count: {
        Args: { user_uuid?: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: void
      }
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      send_message: {
        Args: {
          p_campaign_id: string
          p_sender_id: string
          p_receiver_id: string
          p_content: string
          p_proposal_id?: string | null
          p_message_type?: string | null
        }
        Returns: string
      }
      mark_messages_as_read: {
        Args: { p_campaign_id: string; p_sender_id?: string | null }
        Returns: number
      }
      mark_messages_read: {
        Args: { p_message_ids: string[] }
        Returns: number
      }
      update_expert_hashtags: {
        Args: { p_expert_id: string }
        Returns: void
      }
      match_campaign_experts: {
        Args: { p_campaign_id: string; p_stage?: number; p_limit?: number }
        Returns: {
          expert_id: string
          user_id: string
          name: string
          skills: string[]
          hashtags: string[]
          bio: string | null
          hourly_rate: number | null
          rating: number
          total_projects: number
          match_score: number
        }[]
      }
      check_notification_preference: {
        Args: { p_user_id: string; p_notification_type: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_action_type: string; p_max_requests?: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type UserRole = 'expert' | 'organization' | 'admin'
export type CampaignType = 'mentoring' | 'investment' | 'service' | 'lecture_mentoring' | 'investor_matching' | 'service_outsourcing'

// Additional types for forms
export interface CareerItem {
  company: string
  position: string
  start_date: string
  end_date?: string
  is_current?: boolean
  description?: string
}

export interface EducationItem {
  school: string
  major: string
  degree: string
  status: '졸업' | '졸업예정' | '재학' | '휴학' | '중퇴'
  graduation_year: string
}
