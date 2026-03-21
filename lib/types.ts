export type PaymentOption = "insurance" | "self-pay" | "sliding-scale" | "eap";
export type AppointmentType = "individual" | "couples" | "family" | "group";
export type SessionCode = "90837" | "90834" | "90847" | "90853" | "90791";

export interface Session {
  id: string;
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

export interface TherapistProfile {
  name: string;
  annual_goal: number;
  target_weekly_sessions: number;
  avg_session_duration: number;
}
