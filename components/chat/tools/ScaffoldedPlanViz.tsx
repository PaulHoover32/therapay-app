"use client";

import { Area, ComposedChart, XAxis, YAxis, Line, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";

interface Milestone {
  month: string;
  actual: number | null;
  targetRevThisMonth: number;
  cumulativeTarget: number;
  cumulativePace: number;
  sessionsNeeded: number;
  clientsThisMonth?: number;
}

interface Props {
  data: {
    mode?: "new-practice" | "established";
    annualTarget: number;
    addRatePerMonth?: number;
    ytdRevenue: number;
    currentAnnualPace: number;
    currentMonthlyPace: number;
    neededMonthlyAvg: number;
    gapToClose: number;
    milestones: Milestone[];
    fullCaseloadMonthlyRevenue?: number;
    monthsToFullCaseload?: number;
    startingClients?: number;
  };
}

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const chartConfig: ChartConfig = {
  cumulativeTarget: { label: "Target ramp", color: "var(--chart-1)" },
  cumulativePace: { label: "Current pace", color: "var(--chart-3)" },
};

export default function ScaffoldedPlanViz({ data }: Props) {
  const isNewPractice = data.mode === "new-practice";
  const addRate = data.addRatePerMonth ?? 2;
  const onPace = data.currentAnnualPace >= data.annualTarget;
  const futureMilestones = data.milestones.filter((m) => m.actual === null && m.targetRevThisMonth > 0);

  return (
    <div className="rounded-xl border bg-card p-4 my-1 max-w-[340px] space-y-4">
      <div>
        <p className="text-xs font-semibold text-foreground">
          {isNewPractice ? "Caseload Build Plan" : "Scaffolded Plan"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isNewPractice
            ? `Starting at ${data.startingClients ?? 0} clients · Adding ~${addRate}/month · Full caseload: 20`
            : `Target ${fmt$(data.annualTarget)} · Current pace ${fmt$(data.currentAnnualPace)}/yr`}
        </p>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[160px] w-full">
        <ComposedChart data={data.milestones} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9 }}
            interval={1}
          />
          <YAxis
            tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9 }}
            width={36}
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const milestone = data.milestones.find((m) => m.month === label);
              return (
                <div className="rounded-lg border bg-background px-2.5 py-2 shadow-sm text-xs space-y-1">
                  <p className="font-medium">{label}</p>
                  {payload.map((p) => (
                    <p key={p.dataKey} className="text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                      {chartConfig[p.dataKey as keyof typeof chartConfig]?.label}: {fmt$(Number(p.value))}
                    </p>
                  ))}
                  {isNewPractice && milestone?.clientsThisMonth !== undefined && (
                    <p className="text-muted-foreground">{milestone.clientsThisMonth} clients/week</p>
                  )}
                </div>
              );
            }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            type="monotone"
            dataKey="cumulativeTarget"
            stroke="var(--color-cumulativeTarget)"
            fill="var(--color-cumulativeTarget)"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
          />
          {!isNewPractice && (
            <Line
              type="monotone"
              dataKey="cumulativePace"
              stroke="var(--color-cumulativePace)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          )}
        </ComposedChart>
      </ChartContainer>

      {/* Stats row */}
      {isNewPractice ? (
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Achievable this year</p>
            <p className="text-sm font-semibold">{fmt$(data.annualTarget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Full caseload run rate</p>
            <p className="text-sm font-semibold">{data.fullCaseloadMonthlyRevenue ? fmt$(data.fullCaseloadMonthlyRevenue) + "/mo" : "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Months to full caseload</p>
            <p className="text-sm font-semibold text-violet-400">~{data.monthsToFullCaseload} months</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Monthly avg needed</p>
            <p className="text-sm font-semibold">{fmt$(data.neededMonthlyAvg)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current monthly avg</p>
            <p className="text-sm font-semibold">{fmt$(data.currentMonthlyPace)}</p>
          </div>
          {!onPace && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Gap to close</p>
              <p className="text-sm font-semibold text-amber-400">{fmt$(data.gapToClose)}</p>
            </div>
          )}
          {onPace && (
            <div className="col-span-2">
              <p className="text-xs text-green-400 font-medium">You're on pace to hit your target.</p>
            </div>
          )}
        </div>
      )}

      {/* Monthly breakdown — clients/week for new practice, sessions for established */}
      <div className="border-t pt-3">
        <p className="text-xs text-muted-foreground font-medium mb-2">
          {isNewPractice ? "Clients / week by month" : "Sessions needed / month"}
        </p>
        <div className="grid grid-cols-3 gap-y-1.5 gap-x-2">
          {futureMilestones.slice(0, 6).map((m) => (
            <div key={m.month} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.month}</span>
              <span className="font-medium">
                {isNewPractice ? (m.clientsThisMonth ?? "—") : m.sessionsNeeded}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
