import { TherapistProfile, Session, Goal, Recommendation } from "@/lib/types";
import { seedProfile, seedSessions } from "@/lib/seed-data";
import { SupabaseClient } from "@supabase/supabase-js";

export async function getTherapistProfile(): Promise<TherapistProfile> {
  return seedProfile;
}

export async function getSessionLogs(): Promise<Session[]> {
  return seedSessions;
}

export async function getSessionById(id: string): Promise<Session> {
  const session = seedSessions.find((s) => s.id === id);
  if (!session) throw new Error(`Session not found: ${id}`);
  return session;
}

export interface PayerTypeSummary {
  type: string;
  sessionCount: number;
  pct: number;
  avgPayout: number;
}

export interface TherapistContext {
  name: string;
  therapistId: string | undefined;
  avgSessionDuration: number;
  ytdRevenue: number;
  effectiveYear: number;
  avgWeeklyHours: number;
  avgPayoutPerSession: number;
  weeksRemainingInYear: number;
  payerMix: PayerTypeSummary[];
  existingGoal: {
    annual_income_target: number;
    target_weekly_hours: number;
    target_avg_payout: number;
    optimization_preference: string;
    goal_year: number;
  } | null;
  hasNoData: boolean;
  priorYearRevenue: number | null;
  projectedAnnual: number | null;
}

export async function getTherapistContext(
  supabase: SupabaseClient,
  userId: string
): Promise<TherapistContext> {
  // Fetch therapist profile (single query)
  const { data: therapist } = await supabase
    .from("therapists")
    .select("id, name, avg_session_duration")
    .eq("user_id", userId)
    .single();

  const therapistId = therapist?.id as string | undefined;
  const avgSessionDuration = therapist?.avg_session_duration ?? 50;

  const now = new Date();

  // Fetch ALL sessions (no year filter) + reference payers in parallel
  const [{ data: rawSessions }, { data: refPayers }] = await Promise.all([
    therapistId
      ? supabase
          .from("sessions")
          .select("amount, session_datetime, session_duration, payer")
          .eq("therapist_id", therapistId)
          .order("session_datetime", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("reference_payers")
      .select("name, payment_option")
      .eq("active", true),
  ]);

  const allSessions: { amount: number; session_datetime: string; session_duration: number; payer: string }[] =
    rawSessions ?? [];

  // effectiveToday: use last session date as anchor for stale therapists
  // (same pattern as Dashboard/LeverCards — treats prior-year data as the reference period)
  const latestDateStr = allSessions.length > 0
    ? allSessions[allSessions.length - 1].session_datetime
    : null;
  const effectiveToday = latestDateStr ? new Date(latestDateStr) : now;
  const effectiveYear = effectiveToday.getFullYear();

  // YTD = sessions in the effectiveYear (e.g. 2025 for Lauren, 2026 for current users)
  const ytdRevenue = allSessions
    .filter((s) => new Date(s.session_datetime).getFullYear() === effectiveYear)
    .reduce((sum, s) => sum + s.amount, 0);

  // Trailing 4 weeks anchored at effectiveToday
  const fourWeeksAgo = new Date(effectiveToday.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recent = allSessions.filter((s) => {
    const d = new Date(s.session_datetime);
    return d >= fourWeeksAgo && d <= effectiveToday;
  });
  const avgWeeklyHours = recent.reduce((sum, s) => sum + s.session_duration, 0) / 60 / 4;
  const avgPayoutPerSession =
    recent.length > 0
      ? recent.reduce((sum, s) => sum + s.amount, 0) / recent.length
      : 0;

  // Payer mix from all-time sessions
  const payerMap = new Map<string, string>();
  (refPayers ?? []).forEach((p: { name: string; payment_option: string }) =>
    payerMap.set(p.name, p.payment_option)
  );
  const byType: Record<string, { count: number; total: number }> = {};
  allSessions.forEach((s) => {
    const type = payerMap.get(s.payer) ?? "insurance";
    if (!byType[type]) byType[type] = { count: 0, total: 0 };
    byType[type].count++;
    byType[type].total += s.amount;
  });
  const totalSessions = allSessions.length;
  const payerMix: PayerTypeSummary[] = Object.entries(byType)
    .map(([type, { count, total }]) => ({
      type,
      sessionCount: count,
      pct: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
      avgPayout: count > 0 ? Math.round(total / count) : 0,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  // Weeks remaining uses real now (agent needs actual time horizon)
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const weeksRemainingInYear = Math.max(
    0,
    Math.round((endOfYear.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  // Derived context fields
  const hasNoData = allSessions.length === 0;

  const priorYear = effectiveYear - 1;
  const priorYearRevenue = allSessions.some((s) => new Date(s.session_datetime).getFullYear() === priorYear)
    ? allSessions
        .filter((s) => new Date(s.session_datetime).getFullYear() === priorYear)
        .reduce((sum, s) => sum + s.amount, 0)
    : null;

  const weeksElapsed = 52 - weeksRemainingInYear;
  const projectedAnnual =
    !hasNoData && effectiveYear === now.getFullYear() && weeksElapsed > 0 && ytdRevenue > 0
      ? Math.round((ytdRevenue / weeksElapsed) * 52)
      : null;

  // Active goal for current calendar year
  const { data: goal } = await supabase
    .from("goals")
    .select(
      "annual_income_target, target_weekly_hours, target_avg_payout, optimization_preference, goal_year"
    )
    .eq("user_id", userId)
    .eq("goal_year", now.getFullYear())
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    name: therapist?.name ?? "therapist",
    therapistId,
    avgSessionDuration,
    ytdRevenue,
    effectiveYear,
    avgWeeklyHours,
    avgPayoutPerSession,
    weeksRemainingInYear,
    payerMix,
    existingGoal: goal ?? null,
    hasNoData,
    priorYearRevenue,
    projectedAnnual,
  };
}

export async function getActiveGoal(
  supabase: SupabaseClient,
  userId: string
): Promise<Goal | null> {
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_year", new Date().getFullYear())
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getRecommendations(
  supabase: SupabaseClient,
  userId: string
): Promise<Recommendation[]> {
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
