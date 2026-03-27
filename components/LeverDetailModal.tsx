"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MetricPoint {
  label: string;
  value: number | null;
  currentValue: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  data: MetricPoint[];
  target: number | null;
  formatter: (v: number) => string;
}

const chartConfig: ChartConfig = {
  value:        { label: "Actual",          color: "var(--chart-1)" },
  currentValue: { label: "This week",       color: "var(--chart-1)" },
  rollingAvg:   { label: "4-wk avg",        color: "var(--chart-2)" },
};

export default function LeverDetailModal({ open, onClose, title, data, target, formatter }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[90vw] max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ChartContainer config={chartConfig} className="h-[420px] w-full">
          <ComposedChart data={data} margin={{ top: 16, right: 56, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval={3}
            />
            <YAxis
              tickFormatter={formatter}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={56}
              domain={[0, (dataMax: number) => Math.max(dataMax, target ?? 0) * 1.15]}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const rows = (payload as {dataKey: string; value: number}[]).filter(
                  (p) => p.value != null && ["value", "currentValue", "rollingAvg"].includes(p.dataKey)
                );
                if (!rows.length) return null;
                return (
                  <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-xs space-y-1">
                    <p className="font-medium text-foreground mb-1">Week of {label}</p>
                    {rows.map((p) => (
                      <p key={p.dataKey} className="text-muted-foreground">
                        {chartConfig[p.dataKey as keyof typeof chartConfig]?.label ?? p.dataKey}:{" "}
                        <span className="text-foreground font-medium">{formatter(p.value)}</span>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {target !== null && (
              <ReferenceLine
                y={target}
                stroke="rgba(150,150,150,0.7)"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: `Target  ${formatter(target)}`, position: "insideTopRight", fontSize: 11, fill: "rgba(150,150,150,0.9)" }}
              />
            )}
            <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} maxBarSize={20} />
            <Bar dataKey="currentValue" fill="var(--color-currentValue)" fillOpacity={0.4} radius={[2, 2, 0, 0]} maxBarSize={20} />
            <Line type="monotone" dataKey="rollingAvg" stroke="var(--color-rollingAvg)" strokeWidth={2} dot={false} connectNulls={false} />
          </ComposedChart>
        </ChartContainer>
      </DialogContent>
    </Dialog>
  );
}
