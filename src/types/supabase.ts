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
          rating: number
          total_projects: number
          created_at: string
          updated_at: string
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
          rating?: number
          total_projects?: number
          created_at?: string
          updated_at?: string
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
          rating?: number
          total_projects?: number
          created_at?: string
          updated_at?: string
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
          created_at?: string
          updated_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          campaign_id: string
          expert_id: string
          cover_letter: string
          proposed_budget: number | null
          proposed_timeline: string | null
          attachments: Json | null
          status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          expert_id: string
          cover_letter: string
          proposed_budget?: number | null
          proposed_timeline?: string | null
          attachments?: Json | null
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          expert_id?: string
          cover_letter?: string
          proposed_budget?: number | null
          proposed_timeline?: string | null
          attachments?: Json | null
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
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
        }
        Insert: {
          id?: string
          campaign_id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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