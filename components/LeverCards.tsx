"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import { Session, TherapistProfile, Goal } from "@/lib/types";
import { parseISO, subWeeks, isAfter, eachWeekOfInterval, startOfYear, endOfYear, format } from "date-fns";
import { cn } from "@/lib/utils";
import LeverDetailModal from "./LeverDetailModal";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
  activeGoal: Goal | null;
}

function getRolling4WeekData(sessions: Session[], today: Date) {
  const weeks: Array<{ revenue: number; sessionCount: number; hours: number }> = [];

  for (let i = 0; i < 6; i++) {
    const weekEnd = subWeeks(today, i);
    const weekStart = subWeeks(today, i + 1);
    const weekSessions = sessions.filter((s) => {
      const d = parseISO(s.session_datetime);
      return isAfter(d, weekStart) && !isAfter(d, weekEnd);
    });
    weeks.unshift({
      revenue: weekSessions.reduce((sum, s) => sum + s.amount, 0),
      sessionCount: weekSessions.length,
      hours: weekSessions.reduce((sum, s) => sum + s.session_duration / 60, 0),
    });
  }

  const last4 = weeks.slice(-4);
  const prev4 = weeks.slice(0, 2);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  const avgRevenue = avg(last4.map((w) => w.revenue));
  const avgHours = avg(last4.map((w) => w.hours));
  const totalSessions = last4.reduce((sum, w) => sum + w.sessionCount, 0);
  const totalRevenue = last4.reduce((sum, w) => sum + w.revenue, 0);
  const avgPayout = totalSessions > 0 ? totalRevenue / totalSessions : 0;

  const prevRevenue = avg(prev4.map((w) => w.revenue));
  const prevHours = avg(prev4.map((w) => w.hours));
  const prevTotalSessions = prev4.reduce((sum, w) => sum + w.sessionCount, 0);
  const prevTotalRevenue = prev4.reduce((sum, w) => sum + w.revenue, 0);
  const prevPayout = prevTotalSessions > 0 ? prevTotalRevenue / prevTotalSessions : 0;

  return { avgRevenue, avgHours, avgPayout, prevRevenue, prevHours, prevPayout };
}

interface MetricPoint {
  label: string;
  value: number | null;
  currentValue: number | null;
  rollingAvg: number | null;
}

interface WeeklyMetrics {
  revenue: MetricPoint[];
  hours: MetricPoint[];
  avgPayout: MetricPoint[];
}

function buildWeeklyMetrics(sessions: Session[], today: Date, now: Date = today): WeeklyMetrics {
  const year = today.getFullYear();
  const weeks = eachWeekOfInterval(
    { start: startOfYear(today), end: now },
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

  type WeekBucket = { revenue: number; hours: number; sessions: number };
  const buckets: Record<string, WeekBucket> = {};

  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    if (d.getFullYear() !== year) continue;
    const k = key(getMonday(d));
    if (!buckets[k]) buckets[k] = { revenue: 0, hours: 0, sessions: 0 };
    buckets[k].revenue += s.amount;
    buckets[k].hours += s.session_duration / 60;
    buckets[k].sessions += 1;
  }

  const revenueRaw: (number | null)[] = [];
  const hoursRaw: (number | null)[] = [];
  const payoutRaw: (number | null)[] = [];
  const labels: string[] = [];
  const isCurrent: boolean[] = [];

  for (const w of weeks) {
    const k = key(w);
    const b = buckets[k];
    labels.push(format(w, "MMM d"));
    isCurrent.push(k === currentMondayKey);
    revenueRaw.push(b?.revenue ?? 0);
    hoursRaw.push(b ? parseFloat(b.hours.toFixed(1)) : 0);
    payoutRaw.push(b?.sessions ? parseFloat((b.revenue / b.sessions).toFixed(0)) : null);
  }

  const trailing4Avg = (arr: (number | null)[], i: number): number | null => {
    const slice = arr.slice(Math.max(0, i - 3), i + 1).filter((v): v is number => v !== null);
    return slice.length > 0 ? parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(1)) : null;
  };

  const revenue: MetricPoint[] = [];
  const hours: MetricPoint[] = [];
  const avgPayout: MetricPoint[] = [];

  for (let i = 0; i < labels.length; i++) {
    const curr = isCurrent[i];
    revenue.push({ label: labels[i], value: curr ? null : revenueRaw[i], currentValue: curr ? revenueRaw[i] : null, rollingAvg: curr ? null : trailing4Avg(revenueRaw, i) });
    hours.push({ label: labels[i], value: curr ? null : hoursRaw[i], currentValue: curr ? hoursRaw[i] : null, rollingAvg: curr ? null : trailing4Avg(hoursRaw, i) });
    avgPayout.push({ label: labels[i], value: curr ? null : payoutRaw[i], currentValue: curr ? payoutRaw[i] : null, rollingAvg: curr ? null : trailing4Avg(payoutRaw, i) });
  }

  return { revenue, hours, avgPayout };
}

function statusColor(value: number, target: number) {
  if (value >= target) return "text-green-600 dark:text-green-400";
  return "text-amber-500 dark:text-amber-400";
}

function statusBg(value: number, target: number) {
  if (value >= target) return "border-l-4 border-l-green-500";
  return "border-l-4 border-l-amber-500";
}

function TrendIcon({ current, prev }: { current: number; prev: number }) {
  if (current > prev * 1.02) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (current < prev * 0.98) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function LeverCards({ sessions, activeGoal }: Props) {
  const now = new Date();
  const latestSession = sessions.length > 0
    ? sessions.reduce((latest, s) => {
        const d = parseISO(s.session_datetime);
        return d > latest ? d : latest;
      }, parseISO(sessions[0].session_datetime))
    : now;
  // velocityDate: anchor rolling averages to last active period (keeps cards meaningful for stale data)
  const velocityDate = latestSession.getFullYear() < now.getFullYear() ? latestSession : now;
  const { avgRevenue, avgHours, avgPayout, prevRevenue, prevHours, prevPayout } =
    getRolling4WeekData(sessions, velocityDate);
  // Modal charts always use current year
  const weeklyMetrics = buildWeeklyMetrics(sessions, now);

  const targetRevenue = activeGoal ? activeGoal.annual_income_target / 52 : null;
  const targetHours = activeGoal?.target_weekly_hours ?? null;
  const targetPayout = activeGoal?.target_avg_payout ?? null;

  type ModalKey = "revenue" | "hours" | "payout";
  const [openModal, setOpenModal] = useState<ModalKey | null>(null);

  const modalProps: Record<ModalKey, { title: string; data: MetricPoint[]; target: number | null; formatter: (v: number) => string }> = {
    revenue: {
      title: "Revenue Velocity — Weekly History",
      data: weeklyMetrics.revenue,
      target: targetRevenue,
      formatter: (v) => `$${Math.round(v).toLocaleString()}`,
    },
    hours: {
      title: "Hours Velocity — Weekly History",
      data: weeklyMetrics.hours,
      target: targetHours,
      formatter: (v) => `${v.toFixed(1)} h`,
    },
    payout: {
      title: "Avg Payout — Weekly History",
      data: weeklyMetrics.avgPayout,
      target: targetPayout,
      formatter: (v) => `$${Math.round(v).toLocaleString()}`,
    },
  };

  const cards: Array<{ title: string; value: string; target: string; current: number; tgt: number | null; prev: number; subtitle: string; modalKey: ModalKey }> = [
    {
      title: "Revenue Velocity",
      value: fmt$(avgRevenue),
      target: targetRevenue !== null ? `${fmt$(targetRevenue)} / wk` : "–",
      current: avgRevenue,
      tgt: targetRevenue,
      prev: prevRevenue,
      subtitle: "4-week rolling avg",
      modalKey: "revenue",
    },
    {
      title: "Hours Velocity",
      value: `${avgHours.toFixed(1)} hrs / wk`,
      target: targetHours !== null ? `${targetHours.toFixed(1)} hrs / wk` : "–",
      current: avgHours,
      tgt: targetHours,
      prev: prevHours,
      subtitle: "4-week rolling avg",
      modalKey: "hours",
    },
    {
      title: "Avg Payout",
      value: fmt$(avgPayout),
      target: targetPayout !== null ? `${fmt$(targetPayout)} / session` : "–",
      current: avgPayout,
      tgt: targetPayout,
      prev: prevPayout,
      subtitle: "4-week rolling avg",
      modalKey: "payout",
    },
  ];

  const active = openModal ? modalProps[openModal] : null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className={cn("gap-2", card.tgt !== null ? statusBg(card.current, card.tgt) : "")}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                {card.title}
                <TrendIcon current={card.current} prev={card.prev} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", card.tgt !== null ? statusColor(card.current, card.tgt) : "")}>
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Target: {card.target}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                <button
                  onClick={() => setOpenModal(card.modalKey)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <BarChart2 className="w-3 h-3" />
                  View history
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
