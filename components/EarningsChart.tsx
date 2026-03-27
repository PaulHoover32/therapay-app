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
import { buildWeeklyForecast, organicForecastStats } from "@/lib/forecasting";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
  activeGoal: Goal | null;
}

const cumulativeConfig: ChartConfig = {
  actual:    { label: "Actual YTD",  color: "var(--chart-1)" },
  projected: { label: "Projected",   color: "var(--chart-2)" },
};

const weeklyConfig: ChartConfig = {
  actual:      { label: "Actual",       color: "var(--chart-1)" },
  currentWeek: { label: "This week",    color: "var(--chart-1)" },
  forecast:    { label: "Forecast",     color: "var(--chart-2)" },
};

// ─── Cumulative chart data (unchanged logic) ─────────────────────────────────

function buildCumulativeData(sessions: Session[], today: Date) {
  const yearStart = startOfYear(today);
  const yearEnd   = endOfYear(today);
  const weeks = eachWeekOfInterval({ start: yearStart, end: yearEnd }, { weekStartsOn: 1 });

  const weeklyActual: Record<string, number> = {};
  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    weeklyActual[key] = (weeklyActual[key] ?? 0) + s.amount;
  }

  const pastWeekRevenues: number[] = [];
  for (const w of weeks) {
    if (w <= today) pastWeekRevenues.push(weeklyActual[w.toISOString().slice(0, 10)] ?? 0);
  }
  const last4 = pastWeekRevenues.slice(-4);
  const velocity = last4.length > 0 ? last4.reduce((a, b) => a + b, 0) / last4.length : 0;

  const data: Array<{ label: string; actual: number | null; projected: number | null }> = [];
  let cumulativeActual = 0;
  let lastActual = 0;
  let projectedWeekCount = 0;

  for (const week of weeks) {
    const key = week.toISOString().slice(0, 10);
    const isPast = week <= today;
    const label = format(week, "MMM d");

    if (isPast) {
      cumulativeActual += weeklyActual[key] ?? 0;
      lastActual = cumulativeActual;
      data.push({ label, actual: cumulativeActual, projected: null });
    } else {
      projectedWeekCount++;
      data.push({ label, actual: null, projected: lastActual + projectedWeekCount * velocity });
    }
  }

  const transitionIdx = data.findIndex((d) => d.projected !== null);
  if (transitionIdx > 0) {
    data[transitionIdx - 1] = { ...data[transitionIdx - 1], projected: lastActual };
  }

  return { data, velocity, ytd: lastActual, projectedAnnual: lastActual + projectedWeekCount * velocity };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

// ─── Component ────────────────────────────────────────────────────────────────

export default function EarningsChart({ sessions, activeGoal }: Props) {
  const [mode, setMode] = useState<"cumulative" | "weekly">("cumulative");

  const today = new Date("2026-03-20");
  const annualGoal = activeGoal?.annual_income_target ?? null;

  // Cumulative mode data
  const { data: cumulativeData, ytd, projectedAnnual, velocity } = buildCumulativeData(sessions, today);

  // Weekly mode data
  const weeklyPoints = buildWeeklyForecast(sessions, today);
  const { organicProjectedAnnual, forecastedWeeklyAvg } = organicForecastStats(weeklyPoints, ytd);
  const completeWeekCount = weeklyPoints.filter((p) => p.actual !== null).length;
  const lowDataWarning = completeWeekCount < 6;

  const gap = annualGoal !== null ? projectedAnnual - annualGoal : null;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <div>
            <p className="text-sm text-muted-foreground">YTD Earnings</p>
            <p className="text-2xl font-bold">{fmt(ytd)}</p>
          </div>
          {mode === "cumulative" ? (
            <div>
              <p className="text-sm text-muted-foreground">Projected Annual</p>
              <p className="text-2xl font-bold">{fmt(projectedAnnual)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Organic Forecast</p>
              <p className="text-2xl font-bold">{fmt(organicProjectedAnnual)}</p>
            </div>
          )}
          {mode === "cumulative" ? (
            <div>
              <p className="text-sm text-muted-foreground">
                {gap !== null ? (gap >= 0 ? "Ahead of Goal" : "Behind Goal") : "vs Goal"}
              </p>
              <p className={`text-2xl font-bold ${gap === null ? "text-muted-foreground" : gap >= 0 ? "text-green-500" : "text-red-500"}`}>
                {gap !== null ? fmt(Math.abs(gap)) : "–"}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Forecast / wk</p>
              <p className="text-2xl font-bold">
                {fmt(forecastedWeeklyAvg)}
                <span className="text-sm font-normal text-muted-foreground">/wk</span>
              </p>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="flex rounded-md border border-border overflow-hidden shrink-0 mt-1">
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
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={3} />
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
              <ReferenceLine y={annualGoal} strokeDasharray="6 3" strokeOpacity={0.5}
                label={{ value: "Goal", position: "insideTopRight", fontSize: 11, opacity: 0.6 }}
              />
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
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={3} />
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
            <ReferenceLine
              y={velocity}
              strokeDasharray="4 2"
              strokeOpacity={0.5}
              label={{ value: "Velocity", position: "insideTopRight", fontSize: 11, opacity: 0.6 }}
            />
            {/* Past complete weeks */}
            <Bar dataKey="actual" fill="var(--color-actual)" radius={[2, 2, 0, 0]} maxBarSize={20} />
            {/* Current partial week — lighter opacity */}
            <Bar dataKey="currentWeek" fill="var(--color-actual)" fillOpacity={0.4} radius={[2, 2, 0, 0]} maxBarSize={20} />
            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
            />
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
