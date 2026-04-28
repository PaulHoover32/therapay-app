"use client";

import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
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
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricPoint {
  label: string;
  value: number | null;
  currentValue: number | null;
  rollingAvg: number | null;
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
  value:        { label: "Weekly actual",  color: "var(--chart-1)" },
  currentValue: { label: "This week",      color: "var(--chart-1)" },
};

export default function LeverDetailModal({ open, onClose, title, data, target, formatter }: Props) {
  const xInterval = Math.max(0, Math.ceil(data.length / 13) - 1);

  // Summary stats from weekly data
  const complete = data.filter((d) => d.value !== null);
  const recent4 = complete.slice(-4);
  const prior4 = complete.slice(-8, -4);
  const recentAvg = recent4.length > 0
    ? recent4.reduce((s, d) => s + (d.value ?? 0), 0) / recent4.length
    : 0;
  const priorAvg = prior4.length > 0
    ? prior4.reduce((s, d) => s + (d.value ?? 0), 0) / prior4.length
    : null;
  const deltaPct = priorAvg && priorAvg > 0
    ? ((recentAvg - priorAvg) / priorAvg) * 100
    : null;
  const targetPct = target && target > 0 ? (recentAvg / target) * 100 : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[90vw] max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        {/* Stats summary row */}
        <div className="grid grid-cols-3 gap-4 py-2 border-y border-border/50">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">4-wk avg</p>
            <p className="text-xl font-semibold">{formatter(recentAvg)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">vs. prior 4 wks</p>
            {deltaPct !== null ? (
              <div className="flex items-center gap-1.5">
                <p className={cn(
                  "text-xl font-semibold",
                  Math.abs(deltaPct) < 2 ? "text-muted-foreground" :
                  deltaPct > 0 ? "text-teal-400" : "text-muted-foreground"
                )}>
                  {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%
                </p>
                {Math.abs(deltaPct) >= 2 && (
                  deltaPct > 0
                    ? <TrendingUp className="w-4 h-4 text-teal-400" />
                    : <TrendingDown className="w-4 h-4 text-muted-foreground" />
                )}
                {Math.abs(deltaPct) < 2 && <Minus className="w-4 h-4 text-muted-foreground" />}
              </div>
            ) : (
              <p className="text-xl font-semibold text-muted-foreground">—</p>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">
              {target !== null ? "vs. goal" : "weeks logged"}
            </p>
            {target !== null && targetPct !== null ? (
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold">{Math.round(targetPct)}%</p>
                <Badge
                  variant="outline"
                  className={cn("text-xs", targetPct >= 100
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                    : targetPct >= 75
                      ? "bg-violet-500/10 text-violet-400 border-violet-500/30"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  )}
                >
                  {targetPct >= 100 ? "On Track" : targetPct >= 75 ? "Getting Close" : "Still Building"}
                </Badge>
              </div>
            ) : (
              <p className="text-xl font-semibold">{complete.length}</p>
            )}
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[340px] w-full">
          <ComposedChart data={data} margin={{ top: 10, right: 48, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval={xInterval}
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
                const rows = (payload as { dataKey: string; value: number }[]).filter(
                  (p) => p.value != null && ["value", "currentValue"].includes(p.dataKey)
                );
                if (!rows.length) return null;
                return (
                  <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs space-y-1.5">
                    <p className="font-medium text-foreground">Week of {label}</p>
                    {rows.map((p) => (
                      <div key={p.dataKey} className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {chartConfig[p.dataKey as keyof typeof chartConfig]?.label ?? p.dataKey}
                        </span>
                        <span className="font-medium text-foreground">{formatter(p.value)}</span>
                      </div>
                    ))}
                    {target !== null && (
                      <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-1.5 mt-1">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="font-medium text-muted-foreground">{formatter(target)}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {target !== null && (
              <ReferenceLine
                y={target}
                stroke="rgba(150,150,150,0.5)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: `Goal  ${formatter(target)}`,
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "rgba(150,150,150,0.8)",
                }}
              />
            )}
            <Bar dataKey="value" fill="url(#barGradient)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="currentValue" fill="var(--color-currentValue)" fillOpacity={0.3} radius={[3, 3, 0, 0]} maxBarSize={18} />
          </ComposedChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: "var(--color-value)" }} />
            <span className="text-xs text-muted-foreground">Weekly actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm opacity-30" style={{ background: "var(--color-currentValue)" }} />
            <span className="text-xs text-muted-foreground">This week (partial)</span>
          </div>
          {target !== null && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-px border-t border-dashed border-muted-foreground opacity-60" />
              <span className="text-xs text-muted-foreground">Goal</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
