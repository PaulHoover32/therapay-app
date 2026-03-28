"use client";

import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";

interface Props {
  data: Array<Record<string, number | string>>;  // { month, "2024": 1200, "2025": 1400, ... }
  years: number[];
  formatter: (v: number) => string;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function MonthlyTrendChart({ data, years, formatter }: Props) {
  const chartConfig: ChartConfig = Object.fromEntries(
    years.map((year, i) => [
      year.toString(),
      { label: year.toString(), color: COLORS[i % COLORS.length] },
    ]),
  );

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={formatter}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={56}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-xs space-y-1">
                <p className="font-medium text-foreground mb-1">{label}</p>
                {payload.map((p) => (
                  <p key={p.dataKey} className="text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.dataKey}: <span className="text-foreground font-medium">{formatter(Number(p.value))}</span>
                  </p>
                ))}
              </div>
            );
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {years.map((year, i) => (
          <Line
            key={year}
            type="monotone"
            dataKey={year.toString()}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
