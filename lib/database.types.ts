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
      import_batches: {
        Row: {
          created_at: string
          filename: string | null
          grain: string
          id: string
          inserted_count: number
          row_count: number
          source: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filename?: string | null
          grain: string
          id?: string
          inserted_count?: number
          row_count?: number
          source?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filename?: string | null
          grain?: string
          id?: string
          inserted_count?: number
          row_count?: number
          source?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
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
      mcp_connections: {
        Row: {
          client_id: string
          first_seen_at: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          first_seen_at?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          first_seen_at?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_volume: {
        Row: {
          completed: number
          cpt_code: string
          created_at: string
          id: string
          late_cancel_fee: number
          late_cancels: number
          month: string
          no_shows: number
          payer: string
          platform: string
          source: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          completed?: number
          cpt_code?: string
          created_at?: string
          id?: string
          late_cancel_fee?: number
          late_cancels?: number
          month: string
          no_shows?: number
          payer: string
          platform?: string
          source?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          completed?: number
          cpt_code?: string
          created_at?: string
          id?: string
          late_cancel_fee?: number
          late_cancels?: number
          month?: string
          no_shows?: number
          payer?: string
          platform?: string
          source?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payer_rates: {
        Row: {
          cpt_code: string
          created_at: string
          effective_from: string
          id: string
          payer: string
          platform: string
          rate: number
          therapist_id: string
        }
        Insert: {
          cpt_code: string
          created_at?: string
          effective_from: string
          id?: string
          payer: string
          platform?: string
          rate: number
          therapist_id: string
        }
        Update: {
          cpt_code?: string
          created_at?: string
          effective_from?: string
          id?: string
          payer?: string
          platform?: string
          rate?: number
          therapist_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_id: string | null
          id: string
          import_batch_id: string | null
          payer: string
          payout_date: string
          period_end: string | null
          period_start: string | null
          raw: Json | null
          source: string
          status: string
          therapist_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          import_batch_id?: string | null
          payer: string
          payout_date: string
          period_end?: string | null
          period_start?: string | null
          raw?: Json | null
          source?: string
          status?: string
          therapist_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          import_batch_id?: string | null
          payer?: string
          payout_date?: string
          period_end?: string | null
          period_start?: string | null
          raw?: Json | null
          source?: string
          status?: string
          therapist_id?: string
        }
        Relationships: []
      }
      reference_licensures: {
        Row: {
          code: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          label?: string
          sort_order?: number
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
      reference_platforms: {
        Row: {
          active: boolean
          id: string
          name: string
          payout_lag_days: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          payout_lag_days?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          payout_lag_days?: number
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
      therapists: {
        Row: {
          avg_session_duration: number
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          license_type: string | null
          name: string
          practice_model: string | null
          specialties: string | null
          states: string[] | null
          user_id: string
          years_licensed: number | null
        }
        Insert: {
          avg_session_duration?: number
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          license_type?: string | null
          name: string
          practice_model?: string | null
          specialties?: string | null
          states?: string[] | null
          user_id: string
          years_licensed?: number | null
        }
        Update: {
          avg_session_duration?: number
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          license_type?: string | null
          name?: string
          practice_model?: string | null
          specialties?: string | null
          states?: string[] | null
          user_id?: string
          years_licensed?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
    }
    Enums: {
      appointment_type: "individual" | "couples" | "family" | "group"
      payment_option: "insurance" | "self-pay" | "sliding-scale" | "eap"
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
    },
  },
} as const
