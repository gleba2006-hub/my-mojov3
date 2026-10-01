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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          child_id: string
          code: string
          earned_at: string
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          child_id: string
          code: string
          earned_at?: string
          icon?: string | null
          id?: string
          title: string
        }
        Update: {
          child_id?: string
          code?: string
          earned_at?: string
          icon?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      child_profiles: {
        Row: {
          avatar_id: string | null
          background_id: string | null
          birth_year: number | null
          created_at: string
          family_id: string
          gender: string | null
          id: string
          level: number
          name: string
          pet_id: string | null
          updated_at: string
          user_id: string | null
          xp: number
        }
        Insert: {
          avatar_id?: string | null
          background_id?: string | null
          birth_year?: number | null
          created_at?: string
          family_id: string
          gender?: string | null
          id?: string
          level?: number
          name: string
          pet_id?: string | null
          updated_at?: string
          user_id?: string | null
          xp?: number
        }
        Update: {
          avatar_id?: string | null
          background_id?: string | null
          birth_year?: number | null
          created_at?: string
          family_id?: string
          gender?: string | null
          id?: string
          level?: number
          name?: string
          pet_id?: string | null
          updated_at?: string
          user_id?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "child_profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      code_attempts: {
        Row: {
          bucket: string
          created_at: string
          id: string
          key_hash: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          key_hash: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          key_hash?: string
        }
        Relationships: []
      }
      education_methods: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id: string
          name: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          invite_code_expires_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string | null
          invite_code_expires_at?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          invite_code_expires_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          approved: boolean
          created_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          note: string | null
          value: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          child_id: string
          created_at: string
          id: string
          method_config: Json
          method_id: string
          price_ils: number | null
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          method_config?: Json
          method_id: string
          price_ils?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          method_config?: Json
          method_id?: string
          price_ils?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "education_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      link_codes: {
        Row: {
          child_id: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          child_id: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          child_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_codes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          child_id: string | null
          created_at: string
          family_id: string
          id: string
          read_at: string | null
          sender_user_id: string | null
        }
        Insert: {
          body: string
          child_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          read_at?: string | null
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          child_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          read_at?: string | null
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      money_ledger: {
        Row: {
          amount: number
          child_id: string
          created_at: string
          created_by: string | null
          goal_id: string | null
          id: string
          reason: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Insert: {
          amount: number
          child_id: string
          created_at?: string
          created_by?: string | null
          goal_id?: string | null
          id?: string
          reason?: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Update: {
          amount?: number
          child_id?: string
          created_at?: string
          created_by?: string | null
          goal_id?: string | null
          id?: string
          reason?: string | null
          type?: Database["public"]["Enums"]["ledger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "money_ledger_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_ledger_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          child_id: string | null
          created_at: string
          id: string
          kind: string | null
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          child_id?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          child_id?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      sub_tasks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          needs_parent_approval: boolean
          sort_order: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          needs_parent_approval?: boolean
          sort_order?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          needs_parent_approval?: boolean
          sort_order?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          family_id: string
          id: string
          plan: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          family_id: string
          id?: string
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          family_id?: string
          id?: string
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          child_id: string | null
          created_at: string
          created_by: string | null
          family_id: string
          icon: string | null
          id: string
          kind: Database["public"]["Enums"]["task_kind"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          xp_value: number
          goal_id: string | null
          category: string | null
          repeat_target: number
          repeat_done: number
          advances_goal: boolean
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          family_id: string
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          xp_value?: number
          goal_id?: string | null
          category?: string | null
          repeat_target?: number
          repeat_done?: number
          advances_goal?: boolean
        }
        Update: {
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          family_id?: string
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          xp_value?: number
          goal_id?: string | null
          category?: string | null
          repeat_target?: number
          repeat_done?: number
          advances_goal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }

      child_allowances: {
        Row: { child_id: string; period: string; base_amount: number; payout_day: number; home_amount: number; action_amount: number; updated_at: string }
        Insert: { child_id: string; period?: string; base_amount?: number; payout_day?: number; home_amount?: number; action_amount?: number; updated_at?: string }
        Update: { child_id?: string; period?: string; base_amount?: number; payout_day?: number; home_amount?: number; action_amount?: number; updated_at?: string }
        Relationships: []
      }
      reward_price_ranges: {
        Row: { id: string; label: string; min_ils: number; max_ils: number | null; task_count: number; sort_order: number }
        Insert: { id: string; label: string; min_ils: number; max_ils?: number | null; task_count: number; sort_order?: number }
        Update: { id?: string; label?: string; min_ils?: number; max_ils?: number | null; task_count?: number; sort_order?: number }
        Relationships: []
      }
      reward_paths: {
        Row: { id: string; range_id: string; path_index: number; name: string }
        Insert: { id: string; range_id: string; path_index: number; name: string }
        Update: { id?: string; range_id?: string; path_index?: number; name?: string }
        Relationships: []
      }
      reward_path_tasks: {
        Row: { path_id: string; task_id: string; sort_order: number }
        Insert: { path_id: string; task_id: string; sort_order: number }
        Update: { path_id?: string; task_id?: string; sort_order?: number }
        Relationships: []
      }
      reward_tasks: {
        Row: { id: string; title: string; category: string; kind: Database["public"]["Enums"]["task_kind"] }
        Insert: { id: string; title: string; category: string; kind: Database["public"]["Enums"]["task_kind"] }
        Update: { id?: string; title?: string; category?: string; kind?: Database["public"]["Enums"]["task_kind"] }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "parent" | "child" | "admin"
      goal_status: "draft" | "active" | "completed" | "cancelled"
      ledger_type: "earn" | "deduct" | "payout"
      task_kind: "home" | "action"
      task_status: "active" | "pending_approval" | "approved" | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["parent", "child", "admin"],
      goal_status: ["draft", "active", "completed", "cancelled"],
      ledger_type: ["earn", "deduct", "payout"],
      task_kind: ["home", "action"],
      task_status: ["active", "pending_approval", "approved", "archived"],
    },
  },
} as const
