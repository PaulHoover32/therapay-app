import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/database.types";

// Payouts are cash received (weekly lump sums from Grow, Headway, …). They live apart from
// sessions (work performed) and are never merged with them; reconciliation compares the two.

export const PAYOUT_STATUSES = ["paid", "pending", "failed", "reversed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export interface PayoutFields {
  payer: string;
  payout_date: string;
  amount: number;
  currency?: string;
  external_id?: string | null;
  status?: PayoutStatus;
  period_start?: string | null;
  period_end?: string | null;
  source?: string;
  import_batch_id?: string | null;
  raw?: Json;
}

export const PAYOUT_COLUMNS =
  "id, payer, payout_date, amount, currency, status, period_start, period_end, external_id, source, import_batch_id";

export interface PayoutRow {
  id: string;
  payer: string;
  payout_date: string;
  amount: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  external_id: string | null;
  source: string;
  import_batch_id: string | null;
}

export async function insertPayouts(supabase: SupabaseClient, therapistId: string, payouts: PayoutFields[]) {
  return supabase
    .from("payouts")
    .insert(payouts.map((p) => ({ ...p, therapist_id: therapistId })))
    .select(PAYOUT_COLUMNS)
    .returns<PayoutRow[]>();
}

export async function listPayouts(
  supabase: SupabaseClient,
  therapistId: string,
  { from, to, limit, payer }: { from?: string; to?: string; limit: number; payer?: string }
) {
  let query = supabase
    .from("payouts")
    .select(PAYOUT_COLUMNS)
    .eq("therapist_id", therapistId)
    .order("payout_date", { ascending: false })
    .limit(limit);
  if (from) query = query.gte("payout_date", from);
  if (to) query = query.lt("payout_date", to);
  if (payer) query = query.eq("payer", payer);
  return query.returns<PayoutRow[]>();
}

export async function getPlatforms(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("reference_platforms")
    .select("name, payout_lag_days")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as { name: string; payout_lag_days: number }[];
}
