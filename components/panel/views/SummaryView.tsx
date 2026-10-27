"use client";

import { useAnalytics } from "@/hooks/use-analytics";
import { formatCurrency, formatCurrencyCompact, formatDay, formatNumber, formatPercentChange } from "@/lib/format";
import StatCard from "../StatCard";
import PanelSection from "../PanelSection";
import PanelState from "../PanelState";
import AnalyticsChart from "../AnalyticsChart";

const n = (v: unknown) => (typeof v === "number" ? v : 0);

export default function SummaryView() {
  const summary = useAnalytics("summary");
  const weekly = useAnalytics("weeklyRevenue", { weeks: 12 });

  if (summary.loading || summary.error) return <PanelState loading={summary.loading} error={summary.error} />;
  const s = summary.rows?.[0];
  if (!s || !n(s.total_sessions)) return <PanelState empty="No sessions logged yet. Ask the assistant to log your first one." />;

  const ytd = n(s.ytd_revenue);
  const projected = typeof s.projected_annual === "number" ? s.projected_annual : null;
  const last28 = n(s.last28_revenue);
  const prev28 = n(s.prev28_revenue);
  const change = formatPercentChange(last28, prev28);
  const goal = typeof s.goal_annual_target === "number" ? s.goal_annual_target : null;
  const avgPayout = n(s.last28_sessions) ? last28 / n(s.last28_sessions) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label={`${s.effective_year} revenue`} value={formatCurrency(ytd)} detail={`${formatNumber(n(s.ytd_sessions))} sessions`} />
        <StatCard
          label="Projected year"
          value={formatCurrency(projected)}
          detail={goal && projected != null ? `${Math.round((projected / goal) * 100)}% of ${formatCurrency(goal)} goal` : goal ? "No sessions this year yet" : "No goal set"}
          tone={goal && projected != null ? (projected >= goal ? "up" : "down") : "default"}
        />
        <StatCard
          label="Last 28 days"
          value={formatCurrency(last28)}
          detail={change ? `${change} vs prior 28` : null}
          tone={last28 >= prev28 ? "up" : "down"}
        />
        <StatCard
          label="Avg payout"
          value={formatCurrency(avgPayout)}
          detail={`${formatNumber(n(s.last28_hours) / 4, 1)} hrs/week`}
        />
      </div>

      <PanelSection title="Weekly revenue">
        {weekly.rows?.length ? (
          <AnalyticsChart
            rows={weekly.rows}
            xKey="week_start"
            series={[{ key: "revenue", label: "Revenue" }]}
            formatX={(v) => formatDay(v)}
            formatY={formatCurrencyCompact}
          />
        ) : (
          <PanelState loading={weekly.loading} error={weekly.error} empty="No sessions in the last 12 weeks." />
        )}
      </PanelSection>

      <p className="text-xs text-muted-foreground">Through {formatDay(String(s.anchor_date), { month: "short", day: "numeric", year: "numeric" })}.</p>
    </div>
  );
}
