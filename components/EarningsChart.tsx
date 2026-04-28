"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { format, parseISO, startOfYear, endOfYear, eachWeekOfInterval } from "date-fns";
import { Session, TherapistProfile, Goal } from "@/lib/types";
import { buildWeeklyForecast } from "@/lib/forecasting";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
  activeGoal: Goal | null;
}

const cumulativeConfig: ChartConfig = {
  actual:    { label: "Actual YTD",  color: "var(--chart-1)" },
  projected: { label: "Projected",   color: "var(--chart-2)" },
  priorYear: { label: "Prior year",  color: "var(--chart-3)" },
};

const weeklyConfig: ChartConfig = {
  priorYear:   { label: "Prior year",  color: "var(--chart-3)" },
  actual:      { label: "Actual",      color: "var(--chart-1)" },
  currentWeek: { label: "This week",   color: "var(--chart-1)" },
  forecast:    { label: "Forecast",    color: "var(--chart-2)" },
};

// ─── Shared helper ────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function mondayKey(d: Date): string {
  return getMonday(d).toISOString().slice(0, 10);
}

// ─── Cumulative chart data ────────────────────────────────────────────────────

function buildCumulativeData(sessions: Session[], today: Date) {
  const year = today.getFullYear();
  const yearStart = startOfYear(today);
  const weeks = eachWeekOfInterval({ start: yearStart, end: endOfYear(today) }, { weekStartsOn: 1 });

  // Bucket all sessions by week key (any year)
  const weeklyActual: Record<string, number> = {};
  for (const s of sessions) {
    const key = mondayKey(parseISO(s.session_datetime));
    weeklyActual[key] = (weeklyActual[key] ?? 0) + s.amount;
  }

  // Velocity: average of last 4 active session weeks (any year)
  const recentKeys = Object.keys(weeklyActual).sort().slice(-4);
  const velocity = recentKeys.reduce((sum, k) => sum + weeklyActual[k], 0) / 4;

  const hasCurrentYearRevenue = sessions.some(
    (s) => parseISO(s.session_datetime).getFullYear() === year,
  );

  // Prior year cumulative by week index — aligned to same x-axis positions
  const priorYearNum = year - 1;
  const hasPriorYear = sessions.some((s) => parseISO(s.session_datetime).getFullYear() === priorYearNum);
  const priorCumByIndex: Record<number, number> = {};
  if (hasPriorYear) {
    const priorStart = startOfYear(new Date(priorYearNum, 0, 1));
    const priorWeeks = eachWeekOfInterval(
      { start: priorStart, end: endOfYear(new Date(priorYearNum, 0, 1)) },
      { weekStartsOn: 1 },
    );
    let cum = 0;
    for (let i = 0; i < priorWeeks.length; i++) {
      cum += weeklyActual[priorWeeks[i].toISOString().slice(0, 10)] ?? 0;
      priorCumByIndex[i] = cum;
    }
  }

  const data: Array<{ label: string; actual: number | null; projected: number | null; priorYear: number | null }> = [];

  if (!hasCurrentYearRevenue) {
    for (let i = 0; i < weeks.length; i++) {
      data.push({
        label: format(weeks[i], "MMM d"),
        actual: null,
        projected: (i + 1) * velocity,
        priorYear: hasPriorYear ? (priorCumByIndex[i] ?? null) : null,
      });
    }
    return { data, velocity, ytd: 0, projectedAnnual: weeks.length * velocity, hasPriorYear };
  }

  let cumulativeActual = 0;
  let lastActual = 0;
  let projectedWeekCount = 0;

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const key = week.toISOString().slice(0, 10);
    const isPast = week <= today;
    const label = format(week, "MMM d");

    if (isPast) {
      cumulativeActual += weeklyActual[key] ?? 0;
      lastActual = cumulativeActual;
      data.push({ label, actual: cumulativeActual, projected: null, priorYear: hasPriorYear ? (priorCumByIndex[i] ?? null) : null });
    } else {
      projectedWeekCount++;
      data.push({ label, actual: null, projected: lastActual + projectedWeekCount * velocity, priorYear: hasPriorYear ? (priorCumByIndex[i] ?? null) : null });
    }
  }

  const transitionIdx = data.findIndex((d) => d.projected !== null);
  if (transitionIdx > 0) {
    data[transitionIdx - 1] = { ...data[transitionIdx - 1], projected: lastActual };
  }

  return { data, velocity, ytd: lastActual, projectedAnnual: lastActual + projectedWeekCount * velocity, hasPriorYear };
}

// ─── Prior year weekly revenue by week index ─────────────────────────────────

function buildPriorYearWeekly(sessions: Session[], today: Date): Record<number, number> {
  const priorYearNum = today.getFullYear() - 1;
  const priorStart = startOfYear(new Date(priorYearNum, 0, 1));
  const priorWeeks = eachWeekOfInterval(
    { start: priorStart, end: endOfYear(new Date(priorYearNum, 0, 1)) },
    { weekStartsOn: 1 },
  );

  const weeklyRev: Record<string, number> = {};
  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    if (d.getFullYear() !== priorYearNum) continue;
    const key = mondayKey(d);
    weeklyRev[key] = (weeklyRev[key] ?? 0) + s.amount;
  }

  const result: Record<number, number> = {};
  priorWeeks.forEach((w, i) => {
    result[i] = weeklyRev[w.toISOString().slice(0, 10)] ?? 0;
  });
  return result;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

// ─── Component ────────────────────────────────────────────────────────────────

export default function EarningsChart({ sessions, activeGoal }: Props) {
  const [mode, setMode] = useState<"cumulative" | "weekly">("cumulative");

  const today = new Date();
  const annualGoal = activeGoal?.annual_income_target ?? null;

  // Cumulative mode data
  const { data: cumulativeData, hasPriorYear } = buildCumulativeData(sessions, today);

  // Weekly mode data — enrich with prior year bars if available
  const rawWeeklyPoints = buildWeeklyForecast(sessions, today);
  const priorYearWeekly = hasPriorYear ? buildPriorYearWeekly(sessions, today) : {};
  const weeklyPoints = rawWeeklyPoints.map((p, i) => ({
    ...p,
    priorYear: hasPriorYear ? (priorYearWeekly[i] ?? 0) : null,
  }));

  const completeWeekCount = weeklyPoints.filter((p) => p.actual !== null && (p.actual ?? 0) > 0).length;
  const lowDataWarning = completeWeekCount < 6;

  const cumulativeXInterval = Math.max(0, Math.ceil(cumulativeData.length / 13) - 1);
  const weeklyXInterval = Math.max(0, Math.ceil(weeklyPoints.length / 13) - 1);

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setMode("cumulative")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "cumulative"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cumulative
          </button>
          <button
            onClick={() => setMode("weekly")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "weekly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Charts */}
      {mode === "cumulative" ? (
        <ChartContainer config={cumulativeConfig} className="h-[280px] w-full">
          <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-actual)"    stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-actual)"    stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="fillProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-projected)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-projected)" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="fillPriorYear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-priorYear)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-priorYear)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={cumulativeXInterval} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={48} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [fmt(Number(value)), cumulativeConfig[name as keyof typeof cumulativeConfig]?.label ?? name]}
                  labelFormatter={(label) => `Week of ${label}`}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {annualGoal !== null && (
              <ReferenceLine y={annualGoal} strokeDasharray="4 3" strokeOpacity={0.7}
                label={{ value: "Annual Goal", position: "insideTopRight", fontSize: 11, opacity: 0.8 }}
              />
            )}
            {hasPriorYear && (
              <Area type="monotone" dataKey="priorYear" stroke="var(--color-priorYear)" strokeWidth={2} fill="url(#fillPriorYear)" connectNulls={false} dot={false} strokeDasharray="6 3" strokeOpacity={0.6} />
            )}
            <Area type="monotone" dataKey="actual"    stroke="var(--color-actual)"    strokeWidth={2} fill="url(#fillActual)"    connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="projected" stroke="var(--color-projected)" strokeWidth={2} fill="url(#fillProjected)" connectNulls={false} dot={false} strokeDasharray="6 3" />
          </AreaChart>
        </ChartContainer>
      ) : (
        <div className="space-y-2">
          <ChartContainer config={weeklyConfig} className="h-[280px] w-full">
            <ComposedChart data={weeklyPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={weeklyXInterval} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={48} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [fmt(Number(value)), weeklyConfig[name as keyof typeof weeklyConfig]?.label ?? name]}
                    labelFormatter={(label) => `Week of ${label}`}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {annualGoal !== null && (
                <ReferenceLine
                  y={annualGoal / 52}
                  strokeDasharray="6 3"
                  strokeOpacity={0.5}
                  label={{ value: "Goal/wk", position: "insideTopRight", fontSize: 11, opacity: 0.6 }}
                />
              )}
              {/* Prior year bars rendered first so current year sits on top */}
              {hasPriorYear && (
                <Bar dataKey="priorYear" fill="var(--color-priorYear)" fillOpacity={0.35} radius={[2, 2, 0, 0]} maxBarSize={20} />
              )}
              <Bar dataKey="actual" fill="var(--color-actual)" radius={[2, 2, 0, 0]} maxBarSize={20} />
              <Bar dataKey="currentWeek" fill="var(--color-actual)" fillOpacity={0.4} radius={[2, 2, 0, 0]} maxBarSize={20} />
              <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
            </ComposedChart>
          </ChartContainer>
          {lowDataWarning && (
            <p className="text-xs text-muted-foreground text-center">
              Forecast is based on {completeWeekCount} week{completeWeekCount !== 1 ? "s" : ""} of data — add more sessions for accuracy (6+ weeks recommended).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
