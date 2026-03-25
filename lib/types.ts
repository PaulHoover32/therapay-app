export type PaymentOption = "insurance" | "self-pay" | "sliding-scale" | "eap";
export type AppointmentType = "individual" | "couples" | "family" | "group";
export type SessionCode = string;

export interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  session_datetime: string;
  amount: number;
  payment_option: PaymentOption;
  session_code: SessionCode;
  appointment_type: AppointmentType;
  state: string;
  session_descriptor: string;
  session_duration: number;
  payer: string;
}

// Fields the user provides — DB assigns id, created_at, updated_at
export type SessionInput = Omit<Session, "id" | "created_at" | "updated_at">;

export interface TherapistProfile {
  id: string;
  name: string;
  annual_goal: number;
  target_weekly_sessions: number;
  avg_session_duration: number;
}

export interface ReferencePayer {
  id: string;
  name: string;
  payment_option: PaymentOption;
}

export interface ReferenceSessionCode {
  code: string;
  appointment_type: AppointmentType;
  session_duration: number;
  description: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_year: number;
  annual_income_target: number;
  target_weekly_sessions: number;
  target_avg_payout: number;
  is_active: boolean;
  last_modified_at: string;
  last_modified_by: "user" | "ai";
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  goal_year: number;
  created_at: string;
  annual_income_target: number;
  target_weekly_sessions: number;
  target_avg_payout: number;
  summary: string;
  reasoning: string;
  ytd_revenue_at_time: number;
  avg_weekly_sessions_at_time: number;
  avg_payout_at_time: number;
  weeks_remaining_at_input: number;
}
