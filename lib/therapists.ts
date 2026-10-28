import type { SupabaseClient } from "@supabase/supabase-js";

// Profile fields a therapist can set about their practice. The row itself is created at signup
// by the handle_new_user trigger, so this only ever updates.
export interface PracticeInfo {
  name?: string;
  specialties?: string;
  years_licensed?: number;
  license_type?: string;
  practice_model?: string;
  states?: string[];
  avg_session_duration?: number;
}

export const PROFILE_COLUMNS =
  "id, name, license_type, years_licensed, specialties, practice_model, states, avg_session_duration";

export async function getTherapistByUser(supabase: SupabaseClient, userId: string) {
  return supabase.from("therapists").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle();
}

export async function updatePracticeInfo(supabase: SupabaseClient, userId: string, info: PracticeInfo) {
  const updates = Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined));
  return supabase.from("therapists").update(updates).eq("user_id", userId).select(PROFILE_COLUMNS).maybeSingle();
}

export async function getValidLicenseCodes(supabase: SupabaseClient) {
  const { data } = await supabase.from("reference_licensures").select("code").order("sort_order");
  return (data ?? []).map((r) => r.code as string);
}

export async function getValidPayerNames(supabase: SupabaseClient) {
  const { data } = await supabase.from("reference_payers").select("name").eq("active", true).order("sort_order");
  return (data ?? []).map((r) => r.name as string);
}

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
  "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;
