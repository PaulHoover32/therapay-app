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

export interface TherapistContext {
  name: string;
  avgSessionDuration: number;
  ytdRevenue: number;
  avgWeeklyHours: number;
  avgPayoutPerSession: number;
  weeksRemainingInYear: number;
  existingGoal: {
    annual_income_target: number;
    target_weekly_hours: number;
    target_avg_payout: number;
    optimization_preference: string;
    goal_year: number;
  } | null;
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

  const therapistId = therapist?.id;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

  const { data: sessions } = therapistId
    ? await supabase
        .from("sessions")
        .select("amount, session_datetime, session_duration")
        .eq("therapist_id", therapistId)
        .gte("session_datetime", startOfYear)
    : { data: [] };

  const allSessions: { amount: number; session_datetime: string; session_duration: number }[] = sessions ?? [];

  // YTD revenue
  const ytdRevenue = allSessions.reduce((sum, s) => sum + s.amount, 0);

  // Last 4 weeks
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recent = allSessions.filter(
    (s) => new Date(s.session_datetime) >= fourWeeksAgo
  );
  // Compute hours from real session_duration values (minutes → hours, averaged over 4 weeks)
  const avgWeeklyHours = recent.reduce((sum, s) => sum + s.session_duration, 0) / 60 / 4;
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
    avgSessionDuration: therapist?.avg_session_duration ?? 50,
    ytdRevenue,
    avgWeeklyHours,
    avgPayoutPerSession,
    weeksRemainingInYear,
    existingGoal: goal ?? null,
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
