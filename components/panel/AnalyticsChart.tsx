"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Row } from "@/lib/analytics/queries";

interface Props {
  rows: Row[];
  xKey: string;
  series: { key: string; label: string; dashed?: boolean }[];
  type?: "bar" | "line" | "area";
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export default function AnalyticsChart({ rows, xKey, series, type = "bar", formatX, formatY }: Props) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: COLORS[i % COLORS.length] }])
  );
  const common = { data: rows, margin: { left: 4, right: 8, top: 8 } };
  // Recharts 2 only finds axes among direct children, so this is an array rather than a fragment
  const axes = [
    <CartesianGrid key="grid" vertical={false} />,
    <XAxis key="x" dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={formatX} />,
    <YAxis key="y" tickLine={false} axisLine={false} width={44} tickFormatter={formatY} />,
    <ChartTooltip key="tooltip" content={<ChartTooltipContent labelFormatter={(v) => (formatX ? formatX(String(v)) : String(v))} />} />,
    ...(series.length > 1 ? [<ChartLegend key="legend" content={<ChartLegendContent />} />] : []),
  ];

  return (
    <ChartContainer config={config} className="aspect-[4/3] w-full">
      {type === "line" ? (
        <LineChart {...common}>
          {axes}
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} stroke={`var(--color-${s.key})`} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} />
          ))}
        </LineChart>
      ) : type === "area" ? (
        <AreaChart {...common}>
          {axes}
          {series.map((s) => (
            <Area key={s.key} dataKey={s.key} stroke={`var(--color-${s.key})`} fill={`var(--color-${s.key})`} fillOpacity={0.2} />
          ))}
        </AreaChart>
      ) : (
        <BarChart {...common}>
          {axes}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={4} />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
}
