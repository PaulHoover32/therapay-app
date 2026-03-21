"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Session, TherapistProfile } from "@/lib/types";
import { parseISO, subWeeks, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
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
  const avgSessions = avg(last4.map((w) => w.sessionCount));
  const avgHours = avg(last4.map((w) => w.hours));

  const prevRevenue = avg(prev4.map((w) => w.revenue));
  const prevSessions = avg(prev4.map((w) => w.sessionCount));
  const prevHours = avg(prev4.map((w) => w.hours));

  return { avgRevenue, avgSessions, avgHours, prevRevenue, prevSessions, prevHours };
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

export default function LeverCards({ sessions, profile }: Props) {
  const today = new Date("2026-03-20");
  const { avgRevenue, avgSessions, avgHours, prevRevenue, prevSessions, prevHours } =
    getRolling4WeekData(sessions, today);

  const targetRevenue = profile.annual_goal / 52;
  const targetSessions = profile.target_weekly_sessions;
  const targetHours = (profile.target_weekly_sessions * profile.avg_session_duration) / 60;

  const cards = [
    {
      title: "Revenue Velocity",
      value: fmt$(avgRevenue),
      target: `${fmt$(targetRevenue)} / wk`,
      current: avgRevenue,
      tgt: targetRevenue,
      prev: prevRevenue,
      subtitle: "4-week rolling avg",
    },
    {
      title: "Session Velocity",
      value: `${avgSessions.toFixed(1)} / wk`,
      target: `${targetSessions} sessions / wk`,
      current: avgSessions,
      tgt: targetSessions,
      prev: prevSessions,
      subtitle: "4-week rolling avg",
    },
    {
      title: "Hours Velocity",
      value: `${avgHours.toFixed(1)} hrs / wk`,
      target: `${targetHours.toFixed(1)} hrs / wk`,
      current: avgHours,
      tgt: targetHours,
      prev: prevHours,
      subtitle: "4-week rolling avg",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn("gap-2", statusBg(card.current, card.tgt))}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {card.title}
              <TrendIcon current={card.current} prev={card.prev} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", statusColor(card.current, card.tgt))}>
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
