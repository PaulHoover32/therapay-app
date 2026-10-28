"use client";

import { useEffect, useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { usePanelStore } from "@/lib/stores/panel";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, formatCurrencyCompact, formatDay, parseDay } from "@/lib/format";
import StatCard from "../StatCard";
import PanelSection from "../PanelSection";
import PanelState from "../PanelState";
import AnalyticsChart from "../AnalyticsChart";

interface Recommendation {
  id: string;
  created_at: string;
  summary: string;
  annual_income_target: number;
}

const n = (v: unknown) => (typeof v === "number" ? v : 0);

export default function GoalView() {
  const summary = useAnalytics("summary");
  const cumulative = useAnalytics("cumulativeYtd");
  const dataVersion = usePanelStore((s) => s.dataVersion);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    createSupabaseBrowserClient()
      .from("recommendations")
      .select("id, created_at, summary, annual_income_target")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecs(data ?? []));
  }, [dataVersion]);

  if (summary.loading || summary.error) return <PanelState loading={summary.loading} error={summary.error} />;
  const s = summary.rows?.[0];
  const goal = typeof s?.goal_annual_target === "number" ? s.goal_annual_target : null;

  // Straight-line pace to the goal, aligned to each week's end
  const rows = (cumulative.rows ?? []).map((r) => {
    const start = parseDay(String(r.week_start));
    const dayOfYear = (start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / 86400000 + 7;
    return { ...r, pace: goal ? Math.round((goal * Math.min(dayOfYear, 365)) / 365) : null };
  });

  return (
    <div className="space-y-6">
      {goal ? (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label={`${s?.goal_year} goal`} value={formatCurrency(goal)} />
          <StatCard
            label="Earned so far"
            value={formatCurrency(n(s?.ytd_revenue))}
            detail={`${Math.round((n(s?.ytd_revenue) / goal) * 100)}% of goal`}
          />
          <StatCard label="Target hours/week" value={String(s?.goal_weekly_hours ?? "—")} />
          <StatCard label="Target avg payout" value={formatCurrency(n(s?.goal_avg_payout))} />
        </div>
      ) : (
        <PanelState empty="No goal set for this year yet. Ask the assistant to help you set one." />
      )}

      {rows.length > 0 && (
        <PanelSection title="Cumulative vs goal pace">
          <AnalyticsChart
            type="line"
            rows={rows}
            xKey="week_start"
            series={[
              { key: "cumulative", label: "Earned" },
              ...(goal ? [{ key: "pace", label: "Goal pace", dashed: true }] : []),
            ]}
            formatX={(v) => formatDay(v)}
            formatY={formatCurrencyCompact}
          />
        </PanelSection>
      )}

      <PanelSection title="Recommendations">
        {recs === null ? (
          <PanelState loading />
        ) : recs.length ? (
          <ul className="space-y-2">
            {recs.map((r) => (
              <li key={r.id} className="rounded-xl border p-3 text-sm">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{formatDay(r.created_at, { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span>{formatCurrency(r.annual_income_target)}</span>
                </div>
                <p className="line-clamp-3">{r.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recommendations yet.</p>
        )}
      </PanelSection>
    </div>
  );
}
