"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface Props {
  data: Array<{ year: string; insurance: number; "self-pay": number; "sliding-scale": number; eap: number }>;
  formatter: (v: number) => string;
}

const chartConfig: ChartConfig = {
  insurance:       { label: "Insurance",      color: "var(--chart-1)" },
  "self-pay":      { label: "Self-Pay",       color: "var(--chart-2)" },
  "sliding-scale": { label: "Sliding Scale",  color: "var(--chart-3)" },
  eap:             { label: "EAP",            color: "var(--chart-4)" },
};

const PAYMENT_OPTIONS = ["insurance", "self-pay", "sliding-scale", "eap"] as const;

export default function PayerMixChart({ data, formatter }: Props) {
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
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
            return (
              <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-xs space-y-1">
                <p className="font-medium text-foreground mb-1">{label}</p>
                {payload.map((p) => (
                  <p key={p.dataKey} className="text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {chartConfig[p.dataKey as keyof typeof chartConfig]?.label}:{" "}
                    <span className="text-foreground font-medium">{formatter(Number(p.value))}</span>
                  </p>
                ))}
                <p className="border-t pt-1 text-foreground font-medium">Total: {formatter(total)}</p>
              </div>
            );
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {PAYMENT_OPTIONS.map((opt) => (
          <Bar
            key={opt}
            dataKey={opt}
            stackId="mix"
            fill={`var(--color-${opt})`}
            radius={opt === "eap" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={80}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
