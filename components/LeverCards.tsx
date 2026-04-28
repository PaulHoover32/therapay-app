"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import { Session, TherapistProfile, Goal } from "@/lib/types";
import { parseISO, subDays, eachWeekOfInterval, startOfYear, format } from "date-fns";
import { cn } from "@/lib/utils";
import LeverDetailModal from "./LeverDetailModal";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
  activeGoal: Goal | null;
  effectiveToday: Date;
}

function getDailyMetrics(sessions: Session[], today: Date) {
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

  // Working days = distinct calendar dates with at least 1 session
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

  // Used to derive a daily revenue goal from the annual target
  const workingDaysPerWeek = currentDays / 4;

  return {
    revenuePerDay, prevRevenuePerDay,
    hoursPerDay, prevHoursPerDay,
    avgPayout, prevPayout,
    workingDaysPerWeek,
  };
}

interface MetricPoint {
  label: string;
  value: number | null;
  currentValue: number | null;
  rollingAvg: number | null;
}

interface WeeklyMetrics {
  revenue: MetricPoint[];
  sessions: MetricPoint[];
  avgPayout: MetricPoint[];
}

function buildWeeklyMetrics(sessions: Session[], today: Date): WeeklyMetrics {
  const year = today.getFullYear();
  const weeks = eachWeekOfInterval(
    { start: startOfYear(today), end: today },
    { weekStartsOn: 1 },
  );

  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  };
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const currentMondayKey = key(getMonday(today));

  type WeekBucket = { revenue: number; sessionCount: number };
  const buckets: Record<string, WeekBucket> = {};

  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    if (d.getFullYear() !== year) continue;
    const k = key(getMonday(d));
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
    const k = key(w);
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

function statusTier(pct: number | null): "building" | "close" | "on-track" | "none" {
  if (pct === null) return "none";
  if (pct >= 100) return "on-track";
  if (pct >= 75) return "close";
  return "building";
}

function statusBorderColor(pct: number | null): string {
  const tier = statusTier(pct);
  if (tier === "on-track") return "border-l-4 border-l-teal-500";
  if (tier === "close") return "border-l-4 border-l-violet-500";
  if (tier === "building") return "border-l-4 border-l-blue-500";
  return "";
}

function StatusBadge({ pct }: { pct: number | null }) {
  const tier = statusTier(pct);
  if (tier === "none") return null;
  if (tier === "on-track") return (
    <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/10">
      On Track
    </Badge>
  );
  if (tier === "close") return (
    <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/10">
      Getting Close
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/10">
      Still Building
    </Badge>
  );
}

function ProgressBar({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const tier = statusTier(pct);
  const fill = tier === "on-track" ? "bg-teal-500" : tier === "close" ? "bg-violet-500" : "bg-blue-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all [width:var(--bar-pct)]", fill)}
        style={{ "--bar-pct": `${Math.min(pct, 100)}%` } as React.CSSProperties}
      />
    </div>
  );
}

function TrendIcon({ current, prev }: { current: number; prev: number }) {
  if (current > prev * 1.02) return <TrendingUp className="w-4 h-4 text-teal-500" />;
  if (current < prev * 0.98) return <TrendingDown className="w-4 h-4 text-muted-foreground" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function LeverCards({ sessions, activeGoal, effectiveToday }: Props) {
  const now = new Date();
  const {
    revenuePerDay, prevRevenuePerDay,
    hoursPerDay, prevHoursPerDay,
    avgPayout, prevPayout,
    workingDaysPerWeek,
  } = getDailyMetrics(sessions, effectiveToday);

  const weeklyMetrics = buildWeeklyMetrics(sessions, now);

  // Revenue/day goal: derived from annual target ÷ 52 weeks ÷ avg working days/week
  // Clamp to [3, 5] — a therapist works at least 3 days/week, at most 5
  const effectiveDaysPerWeek = Math.min(5, Math.max(3, workingDaysPerWeek > 0 ? workingDaysPerWeek : 5));
  const targetRevenuePerDay = activeGoal
    ? activeGoal.annual_income_target / 52 / effectiveDaysPerWeek
    : null;
  const targetPayout = activeGoal?.target_avg_payout ?? null;

  const targetHoursPerDay = activeGoal ? activeGoal.target_weekly_hours / effectiveDaysPerWeek : null;

  const revenuePct = targetRevenuePerDay ? (revenuePerDay / targetRevenuePerDay) * 100 : null;
  const hoursPct = targetHoursPerDay ? (hoursPerDay / targetHoursPerDay) * 100 : null;
  const payoutPct = targetPayout ? (avgPayout / targetPayout) * 100 : null;

  type ModalKey = "revenue" | "sessions" | "payout";
  const [openModal, setOpenModal] = useState<ModalKey | null>(null);

  const modalProps: Record<ModalKey, { title: string; data: MetricPoint[]; target: number | null; formatter: (v: number) => string }> = {
    revenue: {
      title: "Revenue — Weekly History",
      data: weeklyMetrics.revenue,
      target: targetRevenuePerDay ? targetRevenuePerDay * effectiveDaysPerWeek : null,
      formatter: (v) => `$${Math.round(v).toLocaleString()}`,
    },
    sessions: {
      title: "Hours — Weekly History",
      data: weeklyMetrics.sessions,
      target: activeGoal?.target_weekly_hours ?? null,
      formatter: (v) => `${v.toFixed(1)} hrs`,
    },
    payout: {
      title: "Avg Payout — Weekly History",
      data: weeklyMetrics.avgPayout,
      target: targetPayout,
      formatter: (v) => `$${Math.round(v).toLocaleString()}`,
    },
  };

  function deltaLabel(delta: number, prev: number, formatter: (v: number) => string, unit: string): string {
    if (prev === 0) return "No prior period data";
    const sign = delta >= 0 ? "+" : "−";
    return `${sign}${formatter(Math.abs(delta))}${unit} vs. prior 28 days`;
  }

  function deltaColor(delta: number, prev: number): string {
    if (prev === 0 || Math.abs(delta / prev) < 0.02) return "text-muted-foreground";
    return delta > 0 ? "text-teal-400" : "text-muted-foreground";
  }

  const cards = [
    {
      title: "Revenue / Day",
      value: fmt$(revenuePerDay),
      target: targetRevenuePerDay !== null ? `${fmt$(targetRevenuePerDay)} / day` : "No goal set",
      current: revenuePerDay,
      prev: prevRevenuePerDay,
      pct: revenuePct,
      modalKey: "revenue" as ModalKey,
      deltaText: deltaLabel(revenuePerDay - prevRevenuePerDay, prevRevenuePerDay, fmt$, "/day"),
      deltaClass: deltaColor(revenuePerDay - prevRevenuePerDay, prevRevenuePerDay),
      sublabel: "28-day avg · working days only",
    },
    {
      title: "Hours / Day",
      value: `${hoursPerDay.toFixed(1)} hrs`,
      target: targetHoursPerDay !== null ? `${targetHoursPerDay.toFixed(1)} hrs / day` : "No goal set",
      current: hoursPerDay,
      prev: prevHoursPerDay,
      pct: hoursPct,
      modalKey: "sessions" as ModalKey,
      deltaText: deltaLabel(hoursPerDay - prevHoursPerDay, prevHoursPerDay, (v) => `${v.toFixed(1)} hrs`, "/day"),
      deltaClass: deltaColor(hoursPerDay - prevHoursPerDay, prevHoursPerDay),
      sublabel: "28-day avg · working days only",
    },
    {
      title: "Avg Payout",
      value: fmt$(avgPayout),
      target: targetPayout !== null ? `${fmt$(targetPayout)} / session` : "No goal set",
      current: avgPayout,
      prev: prevPayout,
      pct: payoutPct,
      modalKey: "payout" as ModalKey,
      deltaText: deltaLabel(avgPayout - prevPayout, prevPayout, fmt$, "/session"),
      deltaClass: deltaColor(avgPayout - prevPayout, prevPayout),
      sublabel: "28-day avg · per session",
    },
  ];

  const active = openModal ? modalProps[openModal] : null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className={cn("gap-0", statusBorderColor(card.pct))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <StatusBadge pct={card.pct} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold leading-none">{card.value}</p>
                <TrendIcon current={card.current} prev={card.prev} />
              </div>

              <ProgressBar pct={card.pct} />

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", card.deltaClass)}>{card.deltaText}</span>
                {card.pct !== null && (
                  <span className="text-muted-foreground">{Math.round(card.pct)}% of goal</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  {card.pct !== null ? `Goal: ${card.target}` : card.sublabel}
                </p>
                <button
                  onClick={() => setOpenModal(card.modalKey)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <BarChart2 className="w-3 h-3" />
                  History
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {active && (
        <LeverDetailModal
          open={openModal !== null}
          onClose={() => setOpenModal(null)}
          title={active.title}
          data={active.data}
          target={active.target}
          formatter={active.formatter}
        />
      )}
    </>
  );
}
