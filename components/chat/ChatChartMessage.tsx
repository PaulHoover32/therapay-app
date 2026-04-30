"use client";

import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface Series {
  key: string;
  label: string;
  color?: string;
}

export interface ChartSpec {
  type: "bar" | "line" | "area";
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  valuePrefix?: string;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function tickFormatter(prefix: string) {
  return (v: number) => {
    if (v >= 1000) return `${prefix}${(v / 1000).toFixed(0)}k`;
    return `${prefix}${v}`;
  };
}

export default function ChatChartMessage({ spec }: { spec: ChartSpec }) {
  const chartConfig: ChartConfig = Object.fromEntries(
    spec.series.map((s, i) => [
      s.key,
      { label: s.label, color: s.color ?? COLORS[i % COLORS.length] },
    ])
  );

  const prefix = spec.valuePrefix ?? "";
  const shared = { data: spec.data, margin: { top: 4, right: 8, bottom: 0, left: 0 } };

  return (
    <div className="w-full rounded-xl bg-violet-950/60 border border-violet-800/60 p-3 space-y-2">
      <div>
        <p className="text-xs font-semibold text-violet-100">{spec.title}</p>
        {spec.description && (
          <p className="text-xs text-violet-400 mt-0.5">{spec.description}</p>
        )}
      </div>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        {spec.type === "bar" ? (
          <BarChart {...shared}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={tickFormatter(prefix)} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {spec.series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : spec.type === "line" ? (
          <LineChart {...shared}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={tickFormatter(prefix)} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {spec.series.map((s) => (
              <Line key={s.key} dataKey={s.key} stroke={`var(--color-${s.key})`} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        ) : (
          <AreaChart {...shared}>
            <defs>
              {spec.series.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={tickFormatter(prefix)} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {spec.series.map((s) => (
              <Area key={s.key} dataKey={s.key} stroke={`var(--color-${s.key})`} fill={`url(#grad-${s.key})`} strokeWidth={2} />
            ))}
          </AreaChart>
        )}
      </ChartContainer>
    </div>
  );
}
