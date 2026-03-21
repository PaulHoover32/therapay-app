"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
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
import { Session, TherapistProfile } from "@/lib/types";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
}

const chartConfig: ChartConfig = {
  actual: { label: "Actual YTD", color: "var(--chart-1)" },
  projected: { label: "Projected", color: "var(--chart-2)" },
};

function buildChartData(sessions: Session[]) {
  const today = new Date("2026-03-20");
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);

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
    if (w <= today) {
      pastWeekRevenues.push(weeklyActual[w.toISOString().slice(0, 10)] ?? 0);
    }
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

  // Stitch the seam: last actual point also starts the projected line
  const transitionIdx = data.findIndex((d) => d.projected !== null);
  if (transitionIdx > 0) {
    data[transitionIdx - 1] = { ...data[transitionIdx - 1], projected: lastActual };
  }

  return { data, velocity, ytd: lastActual, projectedAnnual: lastActual + projectedWeekCount * velocity };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function EarningsChart({ sessions, profile }: Props) {
  const { data, ytd, projectedAnnual, velocity } = buildChartData(sessions);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">YTD Earnings</p>
          <p className="text-2xl font-bold">{fmt(ytd)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Projected Annual</p>
          <p className="text-2xl font-bold">{fmt(projectedAnnual)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Annual Goal</p>
          <p className="text-2xl font-bold text-muted-foreground">{fmt(profile.annual_goal)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Weekly Velocity</p>
          <p className="text-2xl font-bold">
            {fmt(velocity)}<span className="text-sm font-normal text-muted-foreground">/wk</span>
          </p>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-projected)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-projected)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            interval={3}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  fmt(Number(value)),
                  chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                ]}
                labelFormatter={(label) => `Week of ${label}`}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <ReferenceLine
            y={profile.annual_goal}
            strokeDasharray="6 3"
            strokeOpacity={0.5}
            label={{ value: "Goal", position: "insideTopRight", fontSize: 11, opacity: 0.6 }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--color-actual)"
            strokeWidth={2}
            fill="url(#fillActual)"
            connectNulls={false}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="projected"
            stroke="var(--color-projected)"
            strokeWidth={2}
            strokeDasharray="6 3"
            fill="url(#fillProjected)"
            connectNulls={false}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
