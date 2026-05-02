import { parseISO, subDays, eachWeekOfInterval, startOfYear, format } from "date-fns";
import { weekKey } from "./date-utils";
import { Session } from "./types";

export interface MetricPoint {
  label: string;
  value: number | null;
  currentValue: number | null;
  rollingAvg: number | null;
}

export interface WeeklyMetrics {
  revenue: MetricPoint[];
  sessions: MetricPoint[];
  avgPayout: MetricPoint[];
}

export function getDailyMetrics(sessions: Session[], today: Date) {
  const cutoff28 = subDays(today, 28);
  const cutoff56 = subDays(today, 56);

  const current = sessions.filter((s) => {
    const d = parseISO(s.session_datetime);
    return d >= cutoff28 && d <= today;
  });
  const prior = sessions.filter((s) => {
    const d = parseISO(s.session_datetime);
    return d >= cutoff56 && d < cutoff28;
  });

  const countWorkingDays = (arr: Session[]) =>
    new Set(arr.map((s) => s.session_datetime.slice(0, 10))).size;

  const currentDays = countWorkingDays(current);
  const priorDays = countWorkingDays(prior);

  const currentRevenue = current.reduce((sum, s) => sum + s.amount, 0);
  const priorRevenue = prior.reduce((sum, s) => sum + s.amount, 0);

  const revenuePerDay = currentDays > 0 ? currentRevenue / currentDays : 0;
  const prevRevenuePerDay = priorDays > 0 ? priorRevenue / priorDays : 0;

  const currentHours = current.reduce((sum, s) => sum + s.session_duration / 60, 0);
  const priorHours = prior.reduce((sum, s) => sum + s.session_duration / 60, 0);
  const hoursPerDay = currentDays > 0 ? currentHours / currentDays : 0;
  const prevHoursPerDay = priorDays > 0 ? priorHours / priorDays : 0;

  const avgPayout = current.length > 0 ? currentRevenue / current.length : 0;
  const prevPayout = prior.length > 0 ? priorRevenue / prior.length : 0;

  const workingDaysPerWeek = currentDays / 4;

  return {
    revenuePerDay, prevRevenuePerDay,
    hoursPerDay, prevHoursPerDay,
    avgPayout, prevPayout,
    workingDaysPerWeek,
  };
}

export function buildWeeklyMetrics(sessions: Session[], today: Date): WeeklyMetrics {
  const year = today.getFullYear();
  const weeks = eachWeekOfInterval(
    { start: startOfYear(today), end: today },
    { weekStartsOn: 1 },
  );

  const currentMondayKey = weekKey(today);

  type WeekBucket = { revenue: number; sessionCount: number };
  const buckets: Record<string, WeekBucket> = {};

  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    if (d.getFullYear() !== year) continue;
    const k = weekKey(d);
    if (!buckets[k]) buckets[k] = { revenue: 0, sessionCount: 0 };
    buckets[k].revenue += s.amount;
    buckets[k].sessionCount += 1;
  }

  const revenueRaw: (number | null)[] = [];
  const sessionRaw: (number | null)[] = [];
  const payoutRaw: (number | null)[] = [];
  const labels: string[] = [];
  const isCurrent: boolean[] = [];

  for (const w of weeks) {
    const k = weekKey(w);
    const b = buckets[k];
    labels.push(format(w, "MMM d"));
    isCurrent.push(k === currentMondayKey);
    revenueRaw.push(b?.revenue ?? 0);
    sessionRaw.push(b?.sessionCount ?? 0);
    payoutRaw.push(b?.sessionCount ? parseFloat((b.revenue / b.sessionCount).toFixed(0)) : null);
  }

  const trailing4Avg = (arr: (number | null)[], i: number): number | null => {
    const slice = arr.slice(Math.max(0, i - 3), i + 1).filter((v): v is number => v !== null);
    return slice.length > 0 ? parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(1)) : null;
  };

  const revenue: MetricPoint[] = [];
  const sessionPoints: MetricPoint[] = [];
  const avgPayout: MetricPoint[] = [];

  for (let i = 0; i < labels.length; i++) {
    const curr = isCurrent[i];
    revenue.push({ label: labels[i], value: curr ? null : revenueRaw[i], currentValue: curr ? revenueRaw[i] : null, rollingAvg: curr ? null : trailing4Avg(revenueRaw, i) });
    sessionPoints.push({ label: labels[i], value: curr ? null : sessionRaw[i], currentValue: curr ? sessionRaw[i] : null, rollingAvg: curr ? null : trailing4Avg(sessionRaw, i) });
    avgPayout.push({ label: labels[i], value: curr ? null : payoutRaw[i], currentValue: curr ? payoutRaw[i] : null, rollingAvg: curr ? null : trailing4Avg(payoutRaw, i) });
  }

  return { revenue, sessions: sessionPoints, avgPayout };
}
