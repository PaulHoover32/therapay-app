import { TherapistProfile, Session } from "@/lib/types";
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

export interface TherapistContext {
  name: string;
  ytdRevenue: number;
  avgWeeklySessions: number;
  avgPayoutPerSession: number;
  weeksRemainingInYear: number;
  existingGoal: {
    annual_income_target: number;
    target_weekly_sessions: number;
    target_avg_payout: number;
    optimization_preference: string;
    goal_year: number;
  } | null;
}

export async function getTherapistContext(
  supabase: SupabaseClient,
  userId: string
): Promise<TherapistContext> {
  // Fetch therapist profile
  const { data: therapist } = await supabase
    .from("therapists")
    .select("name, annual_goal, target_weekly_sessions")
    .eq("user_id", userId)
    .single();

  // Fetch all sessions for this therapist
  const { data: therapistRow } = await supabase
    .from("therapists")
    .select("id")
    .eq("user_id", userId)
    .single();

  const therapistId = therapistRow?.id;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

  const { data: sessions } = therapistId
    ? await supabase
        .from("sessions")
        .select("amount, session_datetime, created_at")
        .eq("therapist_id", therapistId)
        .gte("session_datetime", startOfYear)
    : { data: [] };

  const allSessions: { amount: number; session_datetime: string }[] = sessions ?? [];

  // YTD revenue
  const ytdRevenue = allSessions.reduce((sum, s) => sum + s.amount, 0);

  // Last 4 weeks
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recent = allSessions.filter(
    (s) => new Date(s.session_datetime) >= fourWeeksAgo
  );
  const avgWeeklySessions = recent.length / 4;
  const avgPayoutPerSession =
    recent.length > 0
      ? recent.reduce((sum, s) => sum + s.amount, 0) / recent.length
      : 0;

  // Weeks remaining
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const weeksRemainingInYear = Math.max(
    0,
    Math.round((endOfYear.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  // Active goal for this year
  const { data: goal } = await supabase
    .from("goals")
    .select(
      "annual_income_target, target_weekly_sessions, target_avg_payout, optimization_preference, goal_year"
    )
    .eq("user_id", userId)
    .eq("goal_year", now.getFullYear())
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    name: therapist?.name ?? "therapist",
    ytdRevenue,
    avgWeeklySessions,
    avgPayoutPerSession,
    weeksRemainingInYear,
    existingGoal: goal ?? null,
  };
}
