"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

interface Props {
  data: Array<{ year: string; value: number }>;
  formatter: (v: number) => string;
  unit: string;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig: ChartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
};

export default function AnnualSummaryChart({ data, formatter, unit }: Props) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={formatter}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={56}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const { year, value } = payload[0].payload as { year: string; value: number };
            return (
              <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-xs space-y-1">
                <p className="font-medium text-foreground">{year}</p>
                <p className="text-muted-foreground">
                  {formatter(value)}{" "}
                  <span className="text-foreground/60">{unit}</span>
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
