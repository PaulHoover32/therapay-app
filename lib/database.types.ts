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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          recommendation_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          recommendation_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          recommendation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          annual_income_target: number
          avg_payout_growth_per_4w: number | null
          created_at: string
          goal_year: number
          id: string
          is_active: boolean
          last_modified_at: string
          last_modified_by: string
          optimization_preference: string | null
          target_avg_payout: number
          target_weekly_hours: number
          target_weeks_worked: number | null
          user_id: string
          weekly_hours_growth_per_4w: number | null
        }
        Insert: {
          annual_income_target: number
          avg_payout_growth_per_4w?: number | null
          created_at?: string
          goal_year: number
          id?: string
          is_active?: boolean
          last_modified_at?: string
          last_modified_by?: string
          optimization_preference?: string | null
          target_avg_payout: number
          target_weekly_hours: number
          target_weeks_worked?: number | null
          user_id: string
          weekly_hours_growth_per_4w?: number | null
        }
        Update: {
          annual_income_target?: number
          avg_payout_growth_per_4w?: number | null
          created_at?: string
          goal_year?: number
          id?: string
          is_active?: boolean
          last_modified_at?: string
          last_modified_by?: string
          optimization_preference?: string | null
          target_avg_payout?: number
          target_weekly_hours?: number
          target_weeks_worked?: number | null
          user_id?: string
          weekly_hours_growth_per_4w?: number | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          annual_income_target: number
          avg_payout_at_time: number
          avg_payout_growth_per_4w: number | null
          avg_weekly_hours_at_time: number
          created_at: string
          deleted_at: string | null
          goal_year: number
          id: string
          reasoning: string
          summary: string
          target_avg_payout: number
          target_weekly_hours: number
          user_id: string
          weekly_hours_growth_per_4w: number | null
          weeks_remaining_at_input: number
          ytd_revenue_at_time: number
        }
        Insert: {
          annual_income_target: number
          avg_payout_at_time: number
          avg_payout_growth_per_4w?: number | null
          avg_weekly_hours_at_time: number
          created_at?: string
          deleted_at?: string | null
          goal_year: number
          id?: string
          reasoning: string
          summary: string
          target_avg_payout: number
          target_weekly_hours: number
          user_id: string
          weekly_hours_growth_per_4w?: number | null
          weeks_remaining_at_input: number
          ytd_revenue_at_time: number
        }
        Update: {
          annual_income_target?: number
          avg_payout_at_time?: number
          avg_payout_growth_per_4w?: number | null
          avg_weekly_hours_at_time?: number
          created_at?: string
          deleted_at?: string | null
          goal_year?: number
          id?: string
          reasoning?: string
          summary?: string
          target_avg_payout?: number
          target_weekly_hours?: number
          user_id?: string
          weekly_hours_growth_per_4w?: number | null
          weeks_remaining_at_input?: number
          ytd_revenue_at_time?: number
        }
        Relationships: []
      }
      reference_payers: {
        Row: {
          active: boolean
          id: string
          name: string
          payment_option: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          payment_option: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          payment_option?: string
          sort_order?: number
        }
        Relationships: []
      }
      reference_session_codes: {
        Row: {
          active: boolean
          appointment_type: string
          code: string
          description: string | null
          session_duration: number
        }
        Insert: {
          active?: boolean
          appointment_type: string
          code: string
          description?: string | null
          session_duration: number
        }
        Update: {
          active?: boolean
          appointment_type?: string
          code?: string
          description?: string | null
          session_duration?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          amount: number
          created_at: string
          id: string
          payer: string
          session_code: Database["public"]["Enums"]["session_code"]
          session_datetime: string
          state: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payer: string
          session_code: Database["public"]["Enums"]["session_code"]
          session_datetime: string
          state: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payer?: string
          session_code?: Database["public"]["Enums"]["session_code"]
          session_datetime?: string
          state?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          avg_session_duration: number
          created_at: string
          email: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          avg_session_duration?: number
          created_at?: string
          email: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          avg_session_duration?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
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
      appointment_type: "individual" | "couples" | "family" | "group"
      payment_option: "insurance" | "self-pay" | "sliding-scale" | "eap"
      session_code: "90837" | "90834" | "90847" | "90853" | "90791"
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

export const Constants = {
  public: {
    Enums: {
      appointment_type: ["individual", "couples", "family", "group"],
      payment_option: ["insurance", "self-pay", "sliding-scale", "eap"],
      session_code: ["90837", "90834", "90847", "90853", "90791"],
    },
  },
} as const
