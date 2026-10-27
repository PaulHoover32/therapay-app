"use client";

import { useAnalyticsSelect } from "@/hooks/use-analytics";
import { formatCurrencyCompact } from "@/lib/format";
import PanelState from "../PanelState";
import AnalyticsChart from "../AnalyticsChart";

interface Props {
  title?: string;
  sql?: string;
  chartType?: "bar" | "line" | "area";
}

export default function ChartView({ title, sql, chartType }: Props) {
  const { rows, loading, error } = useAnalyticsSelect(sql);
  if (!sql) return <PanelState empty="Ask the assistant to chart something." />;
  if (loading || error) return <PanelState loading={loading} error={error} />;
  if (!rows?.length) return <PanelState empty="That query returned no rows." />;

  const [xKey, ...rest] = Object.keys(rows[0]);
  const numeric = rest.filter((k) => rows.some((r) => typeof r[k] === "number")).slice(0, 3);
  const money = numeric.some((k) => /revenue|amount|payout|earn|income|total/i.test(k));

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium">{title}</h3>}
      <AnalyticsChart
        rows={rows}
        xKey={xKey}
        type={chartType}
        series={numeric.map((k) => ({ key: k, label: k.replace(/_/g, " ") }))}
        formatY={money ? formatCurrencyCompact : undefined}
      />
    </div>
  );
}
