"use client";

import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

interface MixEntry {
  type: string;
  pct: number;
  avgPayout: number;
  count?: number;
}

interface Props {
  data: {
    currentMix: MixEntry[];
    recommendedMix: MixEntry[];
    currentAvgPayout: number;
    targetAvgPayout: number;
    gap: number;
    achievableWithCurrentTypes: boolean;
    highestPayingType: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  "self-pay": "Self-Pay",
  "sliding-scale": "Sliding Scale",
  eap: "EAP",
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function MixDonut({ data, label, avg }: { data: MixEntry[]; label: string; avg: number }) {
  const chartData = data.filter((d) => d.pct > 0).map((d) => ({ name: d.type, value: d.pct }));

  const config: ChartConfig = Object.fromEntries(
    chartData.map((d, i) => [d.name, { label: TYPE_LABELS[d.name] ?? d.name, color: CHART_COLORS[i % CHART_COLORS.length] }])
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <ChartContainer config={config} className="h-[90px] w-[90px]">
        <PieChart>
          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={40} strokeWidth={0}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <p className="text-sm font-semibold">{fmt$(avg)}<span className="text-xs text-muted-foreground font-normal"> avg</span></p>
      <div className="space-y-0.5 w-full">
        {data.filter((d) => d.pct > 0).map((d, i) => (
          <div key={d.type} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-muted-foreground">{TYPE_LABELS[d.type] ?? d.type}</span>
            </span>
            <span className="font-medium">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PayerMixViz({ data }: Props) {
  const projectedAvg = Math.round(
    data.recommendedMix.reduce((sum, t) => sum + t.avgPayout * (t.pct / 100), 0)
  );

  return (
    <div className="rounded-xl border bg-card p-4 my-1 max-w-[340px] space-y-4">
      <div>
        <p className="text-xs font-semibold text-foreground">Payer Mix Analysis</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Current avg {fmt$(data.currentAvgPayout)} → target {fmt$(data.targetAvgPayout)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MixDonut data={data.currentMix} label="Current" avg={data.currentAvgPayout} />
        <MixDonut data={data.recommendedMix} label="Target mix" avg={projectedAvg} />
      </div>

      {/* Avg payout by type */}
      <div className="border-t pt-3 space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">Avg payout by type</p>
        {data.currentMix.map((t) => (
          <div key={t.type} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{TYPE_LABELS[t.type] ?? t.type}</span>
            <span className="font-semibold">{fmt$(t.avgPayout)}</span>
          </div>
        ))}
      </div>

      {!data.achievableWithCurrentTypes && (
        <p className="text-xs text-amber-400 border-t pt-2">
          Your target exceeds avg payouts across all current payer types — adding self-pay slots will be key.
        </p>
      )}
    </div>
  );
}
