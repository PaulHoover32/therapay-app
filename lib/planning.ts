import type { SupabaseClient } from "@supabase/supabase-js";
import type { RateLite, VolumeLite } from "@/lib/pacing";

// Planning inputs the therapist enters: her rate card (payer × CPT code), monthly counts per
// payer × CPT code, and her income goal. Rates and counts are for payer-mix analysis only and
// are never added to income. The goal is numbers only: no free text is ever stored.

export const CPT_CODES = ["90837", "90834", "90791", "90847", "90853"] as const;
export type CptCode = (typeof CPT_CODES)[number];

export const CPT_LABELS: Record<CptCode, string> = {
  "90837": "individual, 53+ min",
  "90834": "individual, 38–52 min",
  "90791": "intake / diagnostic evaluation",
  "90847": "family/couples with patient",
  "90853": "group",
};

export interface RateInput {
  payer: string;
  platform: string;
  cpt_code: CptCode;
  rate: number;
  effective_from: string;
}

export interface VolumeInput {
  payer: string;
  platform: string;
  cpt_code: CptCode | "";
  completed: number;
  no_shows: number;
  late_cancels: number;
  late_cancel_fee: number;
}

const RATE_COLUMNS = "payer, platform, cpt_code, rate, effective_from";
const VOLUME_COLUMNS = "month, payer, platform, cpt_code, completed, no_shows, late_cancels, late_cancel_fee";

/** First day of the month containing `date` (YYYY-MM-DD). */
export const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`;

export async function upsertRates(supabase: SupabaseClient, therapistId: string, rates: RateInput[]) {
  return supabase
    .from("payer_rates")
    .upsert(rates.map((r) => ({ ...r, therapist_id: therapistId })), { onConflict: "therapist_id,payer,platform,cpt_code,effective_from" })
    .select(RATE_COLUMNS)
    .returns<RateLite[]>();
}

export async function getRates(supabase: SupabaseClient, therapistId: string) {
  return supabase.from("payer_rates").select(RATE_COLUMNS).eq("therapist_id", therapistId).order("effective_from").returns<RateLite[]>();
}

/** Saves one month's counts; entering the same month again replaces those rows instead of duplicating. */
export async function upsertMonth(supabase: SupabaseClient, therapistId: string, month: string, rows: VolumeInput[]) {
  return supabase
    .from("monthly_volume")
    .upsert(rows.map((r) => ({ ...r, month, therapist_id: therapistId })), { onConflict: "therapist_id,month,payer,platform,cpt_code" })
    .select(VOLUME_COLUMNS)
    .returns<VolumeLite[]>();
}

export async function getVolumes(supabase: SupabaseClient, therapistId: string, fromMonth: string) {
  return supabase
    .from("monthly_volume")
    .select(VOLUME_COLUMNS)
    .eq("therapist_id", therapistId)
    .gte("month", fromMonth)
    .order("month")
    .returns<VolumeLite[]>();
}

export async function getActiveGoal(supabase: SupabaseClient, userId: string, year: number) {
  return supabase
    .from("goals")
    .select("id, annual_income_target, target_weekly_hours, target_avg_payout")
    .eq("user_id", userId)
    .eq("goal_year", year)
    .eq("is_active", true)
    .order("last_modified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export interface GoalNumbers {
  annual_income_target: number;
  target_weekly_hours: number;
  target_avg_payout: number;
}

/**
 * Replaces this year's active goal (deactivate, then insert). A no-op when the active goal already
 * has the same target. Writes numbers only, never a recommendation or any text.
 */
export async function setActiveGoal(supabase: SupabaseClient, userId: string, year: number, goal: GoalNumbers) {
  const { data: current } = await getActiveGoal(supabase, userId, year);
  if (current && Number(current.annual_income_target) === goal.annual_income_target) return { changed: false, error: null };
  const { error: offError } = await supabase.from("goals").update({ is_active: false }).eq("user_id", userId).eq("goal_year", year).eq("is_active", true);
  if (offError) return { changed: false, error: offError };
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    goal_year: year,
    is_active: true,
    last_modified_by: "ai",
    last_modified_at: new Date().toISOString(),
    ...goal,
  });
  return { changed: !error, error };
}

/** Exactly one of a dollar target or a growth percentage; growth needs a complete last year. */
export function resolveGoalTarget(
  input: { target_income?: number; growth_pct_over_last_year?: number },
  lastYear: { total: number; complete: boolean }
): { target: number } | { error: string } {
  const hasTarget = input.target_income !== undefined;
  const hasGrowth = input.growth_pct_over_last_year !== undefined;
  if (hasTarget === hasGrowth) return { error: "Pass exactly one of target_income or growth_pct_over_last_year." };
  if (hasTarget) return { target: Math.round(input.target_income! * 100) / 100 };
  if (!lastYear.complete || lastYear.total <= 0) {
    return { error: "Last year's payouts aren't complete, so a growth % can't be computed. Give a dollar target, or import last year's payouts first." };
  }
  return { target: Math.round(lastYear.total * (1 + input.growth_pct_over_last_year! / 100) * 100) / 100 };
}

/** Goal columns derived from her rate card, or carried over from the previous goal, else 0 ("not set"). */
export function goalNumbers(target: number, blended: number | null, avgSessionMinutes: number, previous: Omit<GoalNumbers, "annual_income_target"> | null): GoalNumbers {
  if (blended) {
    const sessionsPerWeek = target / blended / 48;
    return {
      annual_income_target: target,
      target_avg_payout: blended,
      target_weekly_hours: Math.round(((sessionsPerWeek * avgSessionMinutes) / 60) * 10) / 10,
    };
  }
  return {
    annual_income_target: target,
    target_avg_payout: previous ? Number(previous.target_avg_payout) : 0,
    target_weekly_hours: previous ? Number(previous.target_weekly_hours) : 0,
  };
}
