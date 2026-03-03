export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          new_values: Json | null
          previous_values: Json | null
          target_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
          target_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
          target_id?: string | null
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string | null
          sender_id: string | null
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          created_at: string
          excerpt: string | null
          faqs: Json | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          published: boolean
          published_at: string | null
          review_status: string
          scheduled_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string
          content: string
          created_at?: string
          excerpt?: string | null
          faqs?: Json | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published?: boolean
          published_at?: string | null
          review_status?: string
          scheduled_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          faqs?: Json | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published?: boolean
          published_at?: string | null
          review_status?: string
          scheduled_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_topic_queue: {
        Row: {
          created_at: string
          created_by: string
          generated_post_id: string | null
          id: string
          pet_type: string
          priority: number
          status: string
          target_keyword: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          generated_post_id?: string | null
          id?: string
          pet_type?: string
          priority?: number
          status?: string
          target_keyword: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          generated_post_id?: string | null
          id?: string
          pet_type?: string
          priority?: number
          status?: string
          target_keyword?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_topic_queue_generated_post_id_fkey"
            columns: ["generated_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      care_reminders: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          pet_id: string | null
          recurrence_days: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          due_date: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          pet_id?: string | null
          recurrence_days?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          pet_id?: string | null
          recurrence_days?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          influencer_id: string
          paid_at: string | null
          referral_id: string | null
          source_transaction_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          influencer_id: string
          paid_at?: string | null
          referral_id?: string | null
          source_transaction_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          influencer_id?: string
          paid_at?: string | null
          referral_id?: string | null
          source_transaction_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          premium_status: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          premium_status?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          premium_status?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          comment: string
          created_at: string
          display_name: string
          id: string
          is_approved: boolean
          pet_type: string | null
          rating: number
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          display_name: string
          id?: string
          is_approved?: boolean
          pet_type?: string | null
          rating: number
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          display_name?: string
          id?: string
          is_approved?: boolean
          pet_type?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          appetite: string
          checkin_date: string
          created_at: string
          energy: string
          health_score: number | null
          id: string
          mood: string
          notes: string | null
          pet_id: string | null
          symptoms_noted: string[] | null
          user_id: string
        }
        Insert: {
          appetite: string
          checkin_date?: string
          created_at?: string
          energy: string
          health_score?: number | null
          id?: string
          mood: string
          notes?: string | null
          pet_id?: string | null
          symptoms_noted?: string[] | null
          user_id: string
        }
        Update: {
          appetite?: string
          checkin_date?: string
          created_at?: string
          energy?: string
          health_score?: number | null
          id?: string
          mood?: string
          notes?: string | null
          pet_id?: string | null
          symptoms_noted?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          pending_balance: number
          promo_code: string
          stripe_connect_id: string | null
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          pending_balance?: number
          promo_code: string
          stripe_connect_id?: string | null
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          pending_balance?: number
          promo_code?: string
          stripe_connect_id?: string | null
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      pet_recommendations: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          pet_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          pet_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          pet_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_recommendations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: number | null
          allergies: string[] | null
          breed: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          photo_url: string | null
          species: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          allergies?: string[] | null
          breed?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          photo_url?: string | null
          species: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          allergies?: string[] | null
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          photo_url?: string | null
          species?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_premium: boolean
          premium_until: string | null
          referred_by_influencer_id: string | null
          scan_credits: number
          triage_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_premium?: boolean
          premium_until?: string | null
          referred_by_influencer_id?: string | null
          scan_credits?: number
          triage_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_premium?: boolean
          premium_until?: string | null
          referred_by_influencer_id?: string | null
          scan_credits?: number
          triage_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_influencer_id_fkey"
            columns: ["referred_by_influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_influencer_id_fkey"
            columns: ["referred_by_influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          ip_hash: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_clicks_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          influencer_id: string
          referred_user_id: string
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          influencer_id: string
          referred_user_id: string
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          influencer_id?: string
          referred_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_history: {
        Row: {
          conversation: Json | null
          created_at: string
          id: string
          next_steps: string | null
          pet_id: string | null
          result_status: string
          result_summary: string | null
          symptoms: string
          user_id: string
        }
        Insert: {
          conversation?: Json | null
          created_at?: string
          id?: string
          next_steps?: string | null
          pet_id?: string | null
          result_status: string
          result_summary?: string | null
          symptoms: string
          user_id: string
        }
        Update: {
          conversation?: Json | null
          created_at?: string
          id?: string
          next_steps?: string | null
          pet_id?: string | null
          result_status?: string
          result_summary?: string | null
          symptoms?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_history_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_overrides: {
        Row: {
          admin_id: string
          admin_note: string | null
          created_at: string
          id: string
          new_priority: string
          original_priority: string
          triage_id: string
        }
        Insert: {
          admin_id: string
          admin_note?: string | null
          created_at?: string
          id?: string
          new_priority: string
          original_priority: string
          triage_id: string
        }
        Update: {
          admin_id?: string
          admin_note?: string | null
          created_at?: string
          id?: string
          new_priority?: string
          original_priority?: string
          triage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_overrides_triage_id_fkey"
            columns: ["triage_id"]
            isOneToOne: false
            referencedRelation: "triage_history"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      veterinary_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding: string | null
          faqs: Json | null
          id: string
          source: string | null
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          embedding?: string | null
          faqs?: Json | null
          id?: string
          source?: string | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          faqs?: Json | null
          id?: string
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          retry_count: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          retry_count?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          retry_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      commissions_secure: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          influencer_id: string | null
          paid_at: string | null
          referral_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          influencer_id?: string | null
          paid_at?: string | null
          referral_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          influencer_id?: string | null
          paid_at?: string | null
          referral_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_approved: boolean | null
          pet_type: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_approved?: boolean | null
          pet_type?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_approved?: boolean | null
          pet_type?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      influencers_secure: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          pending_balance: number | null
          promo_code: string | null
          total_earned: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          pending_balance?: number | null
          promo_code?: string | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          pending_balance?: number | null
          promo_code?: string | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_community_waitlist_count: { Args: never; Returns: number }
      get_influencer_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_referrals: number
          conversion_rate: number
          pending_balance: number
          total_clicks: number
          total_earned: number
          total_signups: number
        }[]
      }
      get_total_assessment_count: { Args: never; Returns: number }
      get_users_for_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      search_veterinary_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          source: string
          title: string
        }[]
      }
      validate_promo_code: {
        Args: { code: string }
        Returns: {
          influencer_id: string
          is_valid: boolean
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
