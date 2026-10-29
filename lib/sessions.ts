import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server-side session reads and writes, shared by the in-app chat and the MCP server.
// Always scoped by therapist_id on top of RLS.

export type SessionCode = Database["public"]["Enums"]["session_code"];
export const SESSION_CODES = ["90837", "90834", "90847", "90853", "90791"] as const satisfies readonly SessionCode[];

export interface SessionFields {
  session_datetime: string;
  amount: number;
  session_code: SessionCode;
  state: string;
  payer: string;
  platform?: string | null;
  source?: string;
  import_batch_id?: string | null;
}

export const SESSION_COLUMNS = "id, session_datetime, amount, session_code, state, payer, platform, source";

export async function insertSessions(supabase: SupabaseClient, therapistId: string, sessions: SessionFields[]) {
  return supabase
    .from("sessions")
    .insert(sessions.map((s) => ({ ...s, therapist_id: therapistId })))
    .select(SESSION_COLUMNS);
}

export async function listSessions(
  supabase: SupabaseClient,
  therapistId: string,
  { from, to, limit, payer }: { from?: string; to?: string; limit: number; payer?: string }
) {
  let query = supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("therapist_id", therapistId)
    .order("session_datetime", { ascending: false })
    .limit(limit);
  if (from) query = query.gte("session_datetime", from);
  if (to) query = query.lt("session_datetime", to);
  if (payer) query = query.eq("payer", payer);
  return query;
}
