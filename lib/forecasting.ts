import { parseISO, eachWeekOfInterval, startOfYear, endOfYear, format } from "date-fns";
import { Session } from "./types";

// ─── Industry seasonal indices ────────────────────────────────────────────────
// 52 entries (index 0 = first calendar week of the year).
// Sourced from typical private-practice therapy patterns:
//   - January: insurance deductible reset + new-year resolutions (+10–12%)
//   - Spring break (mid-April): slight dip
//   - Summer (Jul–Aug): vacations, kids home (-15–17%)
//   - September: back-to-routine surge (+8%)
//   - Thanksgiving week, Christmas/New Year: sharp dips
const SEASONAL_INDEX: number[] = [
  // Jan (wks 1–4)
  1.12, 1.12, 1.10, 1.08,
  // Feb (wks 5–8)
  1.05, 1.05, 1.03, 1.02,
  // Mar (wks 9–12)
  1.00, 1.00, 1.00, 1.00,
  // Apr — spring break dip wks 14–15 (wks 13–16)
  0.98, 0.95, 0.97, 1.00,
  // May (wks 17–20)
  1.02, 1.02, 1.01, 1.00,
  // Jun — summer begins (wks 21–24)
  0.95, 0.92, 0.89, 0.87,
  // Jul (wks 25–28)
  0.84, 0.83, 0.83, 0.83,
  // Aug (wks 29–32)
  0.83, 0.84, 0.86, 0.88,
  // Sep — back to routine (wks 33–36)
  1.05, 1.08, 1.08, 1.06,
  // Oct (wks 37–40)
  1.05, 1.05, 1.04, 1.03,
  // Nov — Thanksgiving week is wk 47 (wks 41–44)
  1.02, 1.02, 0.93, 0.80,
  // Dec — steady decline through holidays (wks 45–48)
  0.95, 0.90, 0.83, 0.76,
  // Dec/Jan seam (wks 49–52)
  0.72, 0.70, 0.68, 0.72,
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyPoint {
  weekStart: string;        // YYYY-MM-DD (Monday)
  label: string;            // "Mar 20"
  actual: number | null;    // revenue for complete past weeks
  currentWeek: number | null; // revenue for the in-progress current week
  forecast: number | null;  // model output for future weeks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function weekKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Weighted linear regression ───────────────────────────────────────────────

function weightedLinearRegression(
  points: { x: number; y: number; w: number }[],
): { m: number; b: number } {
  const Sw   = points.reduce((s, p) => s + p.w, 0);
  const Swx  = points.reduce((s, p) => s + p.w * p.x, 0);
  const Swy  = points.reduce((s, p) => s + p.w * p.y, 0);
  const Swxx = points.reduce((s, p) => s + p.w * p.x * p.x, 0);
  const Swxy = points.reduce((s, p) => s + p.w * p.x * p.y, 0);
  const denom = Sw * Swxx - Swx * Swx;
  if (denom === 0 || Sw === 0) return { m: 0, b: Sw > 0 ? Swy / Sw : 0 };
  const m = (Sw * Swxy - Swx * Swy) / denom;
  const b = (Swy - m * Swx) / Sw;
  return { m, b };
}

// ─── Holt-Winters (multiplicative, annual period = 52 weeks) ─────────────────
// Initializes from one full cycle of data, then runs forward to update
// L (level), T (trend), and S[] (52 seasonal factors).
// Returns a forecast function: h steps ahead → predicted revenue.

const HW_ALPHA = 0.3; // level smoothing
const HW_BETA  = 0.1; // trend smoothing
const HW_GAMMA = 0.3; // seasonal smoothing
const HW_PERIOD = 52;

function holtWinters(revenues: number[]): (weekIndex: number, lastIndex: number) => number {
  const n = revenues.length;

  // Initialize level from first cycle average
  const firstCycleAvg =
    revenues.slice(0, HW_PERIOD).reduce((a, b) => a + b, 0) / HW_PERIOD || 1;

  // Initialize seasonal factors: ratio of each week's value to first-cycle average
  const S: number[] = Array.from({ length: HW_PERIOD }, (_, i) =>
    (revenues[i] ?? firstCycleAvg) / firstCycleAvg,
  );

  // Initialize trend: average weekly growth from first cycle to second (if available)
  let T = 0;
  if (n >= 2 * HW_PERIOD) {
    const secondCycleAvg =
      revenues.slice(HW_PERIOD, 2 * HW_PERIOD).reduce((a, b) => a + b, 0) / HW_PERIOD;
    T = (secondCycleAvg - firstCycleAvg) / HW_PERIOD;
  }

  let L = firstCycleAvg;

  // Update L, T, S through all observed data
  for (let t = HW_PERIOD; t < n; t++) {
    const yt = revenues[t];
    const sIdx = t % HW_PERIOD;
    const prevL = L;
    L = HW_ALPHA * (yt / (S[sIdx] || 1)) + (1 - HW_ALPHA) * (L + T);
    T = HW_BETA * (L - prevL) + (1 - HW_BETA) * T;
    S[sIdx] = HW_GAMMA * (yt / (L || 1)) + (1 - HW_GAMMA) * S[sIdx];
  }

  return (weekIndex: number, lastIndex: number) => {
    const h = weekIndex - lastIndex;
    const sIdx = (n - 1 + h) % HW_PERIOD;
    return Math.max(0, (L + h * T) * (S[sIdx] || 1));
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildWeeklyForecast(sessions: Session[], today: Date): WeeklyPoint[] {
  const year = today.getFullYear();
  const weeks = eachWeekOfInterval(
    { start: startOfYear(today), end: endOfYear(today) },
    { weekStartsOn: 1 },
  );

  // Bucket sessions into calendar weeks (current year only)
  const weeklyRevenue: Record<string, number> = {};
  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    if (d.getFullYear() !== year) continue;
    const key = weekKey(getMonday(d));
    weeklyRevenue[key] = (weeklyRevenue[key] ?? 0) + s.amount;
  }

  const currentMondayKey = weekKey(getMonday(today));

  // Collect complete past weeks (strictly before current week)
  const completeWeeks: { key: string; revenue: number; idx: number }[] = [];
  weeks.forEach((w, i) => {
    const key = weekKey(w);
    if (key < currentMondayKey) {
      completeWeeks.push({ key, revenue: weeklyRevenue[key] ?? 0, idx: i });
    }
  });

  // ── Select forecasting model ──
  // ≥ 52 complete weeks → Holt-Winters (learns own seasonal pattern)
  // < 52 complete weeks → weighted linear regression + industry seasonal prior
  let forecastFn: (weekIndex: number) => number;

  if (completeWeeks.length >= 52) {
    const revenues = completeWeeks.map((w) => w.revenue);
    const lastIdx = completeWeeks[completeWeeks.length - 1].idx;
    const hw = holtWinters(revenues);
    forecastFn = (weekIndex) => hw(weekIndex, lastIdx);
  } else if (completeWeeks.length > 0) {
    const N = completeWeeks.length - 1;
    const DECAY = 0.92;
    const points = completeWeeks.map((w, i) => ({
      x: w.idx,
      y: w.revenue,
      w: Math.pow(DECAY, N - i),
    }));
    const { m, b } = weightedLinearRegression(points);
    forecastFn = (weekIndex) => {
      const seasonal = SEASONAL_INDEX[Math.min(weekIndex % 52, 51)];
      return Math.max(0, (m * weekIndex + b) * seasonal);
    };
  } else {
    forecastFn = () => 0;
  }

  // ── Build output ──
  return weeks.map((w, i) => {
    const key = weekKey(w);
    const label = format(w, "MMM d");
    const isCurrentWeek = key === currentMondayKey;
    const isPast = key < currentMondayKey;

    if (isPast) {
      return { weekStart: key, label, actual: weeklyRevenue[key] ?? 0, currentWeek: null, forecast: null };
    } else if (isCurrentWeek) {
      return { weekStart: key, label, actual: null, currentWeek: weeklyRevenue[key] ?? 0, forecast: null };
    } else {
      return { weekStart: key, label, actual: null, currentWeek: null, forecast: forecastFn(i) };
    }
  });
}

// ─── Derived stats ────────────────────────────────────────────────────────────

export function organicForecastStats(points: WeeklyPoint[], ytd: number): {
  organicProjectedAnnual: number;
  forecastedWeeklyAvg: number;
} {
  const futurePoints = points.filter((p) => p.forecast !== null);
  const forecastSum = futurePoints.reduce((s, p) => s + (p.forecast ?? 0), 0);
  const forecastedWeeklyAvg =
    futurePoints.length > 0 ? forecastSum / futurePoints.length : 0;
  return {
    organicProjectedAnnual: ytd + forecastSum,
    forecastedWeeklyAvg,
  };
}
