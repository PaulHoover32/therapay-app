import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server-side session writes. Mirrors what the original dashboard wrote from the browser
// (same columns, same RLS), so the assistant can log and edit sessions.

export type SessionCode = Database["public"]["Enums"]["session_code"];
export const SESSION_CODES = ["90837", "90834", "90847", "90853", "90791"] as const satisfies readonly SessionCode[];

export interface SessionFields {
  session_datetime: string;
  amount: number;
  session_code: SessionCode;
  state: string;
  payer: string;
}

const RETURNING = "id, session_datetime, amount, session_code, state, payer";

export async function insertSessions(supabase: SupabaseClient, therapistId: string, sessions: SessionFields[]) {
  return supabase
    .from("sessions")
    .insert(sessions.map((s) => ({ ...s, therapist_id: therapistId })))
    .select(RETURNING);
}

export async function updateSession(supabase: SupabaseClient, therapistId: string, id: string, fields: Partial<SessionFields>) {
  return supabase.from("sessions").update(fields).eq("id", id).eq("therapist_id", therapistId).select(RETURNING).single();
}

export async function deleteSession(supabase: SupabaseClient, therapistId: string, id: string) {
  return supabase.from("sessions").delete().eq("id", id).eq("therapist_id", therapistId);
}
