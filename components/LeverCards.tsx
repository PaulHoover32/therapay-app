"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Session, TherapistProfile, Goal } from "@/lib/types";
import { parseISO, subWeeks, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

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

function statusColor(value: number, target: number) {
  if (value >= target) return "text-green-600 dark:text-green-400";
  if (value >= target * 0.9) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function statusBg(value: number, target: number) {
  if (value >= target) return "border-l-4 border-l-green-500";
  if (value >= target * 0.9) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-red-500";
}

function TrendIcon({ current, prev }: { current: number; prev: number }) {
  if (current > prev * 1.02) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (current < prev * 0.98) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function LeverCards({ sessions, activeGoal }: Props) {
  const today = new Date("2026-03-20");
  const { avgRevenue, avgHours, avgPayout, prevRevenue, prevHours, prevPayout } =
    getRolling4WeekData(sessions, today);

  const targetRevenue = activeGoal ? activeGoal.annual_income_target / 52 : null;
  const targetHours = activeGoal?.target_weekly_hours ?? null;
  const targetPayout = activeGoal?.target_avg_payout ?? null;

  const cards = [
    {
      title: "Revenue Velocity",
      value: fmt$(avgRevenue),
      target: targetRevenue !== null ? `${fmt$(targetRevenue)} / wk` : "–",
      current: avgRevenue,
      tgt: targetRevenue,
      prev: prevRevenue,
      subtitle: "4-week rolling avg",
    },
    {
      title: "Hours Velocity",
      value: `${avgHours.toFixed(1)} hrs / wk`,
      target: targetHours !== null ? `${targetHours.toFixed(1)} hrs / wk` : "–",
      current: avgHours,
      tgt: targetHours,
      prev: prevHours,
      subtitle: "4-week rolling avg",
    },
    {
      title: "Avg Payout",
      value: fmt$(avgPayout),
      target: targetPayout !== null ? `${fmt$(targetPayout)} / session` : "–",
      current: avgPayout,
      tgt: targetPayout,
      prev: prevPayout,
      subtitle: "4-week rolling avg",
    },
  ];

  return (
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
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
