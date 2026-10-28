"use client";

import { useAnalytics } from "@/hooks/use-analytics";
import { formatCurrency, formatDay, formatNumber } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PanelSection from "../PanelSection";
import PanelState from "../PanelState";

export default function SessionsView() {
  const recent = useAnalytics("recentSessions", { limit: 25 });
  const payers = useAnalytics("payerMix", { days: 365 });

  const payerRows = payers.rows ?? [];
  const totalRevenue = payerRows.reduce((sum, r) => sum + Number(r.revenue ?? 0), 0);

  return (
    <div className="space-y-6">
      <PanelSection title="Payer mix · last 12 months">
        {payerRows.length ? (
          <ul className="space-y-2">
            {payerRows.slice(0, 8).map((r) => {
              const pct = totalRevenue ? (Number(r.revenue) / totalRevenue) * 100 : 0;
              return (
                <li key={String(r.payer)} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{r.payer}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCurrency(Number(r.revenue))} · {formatNumber(Number(r.sessions))}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    {/* Width is data-driven, so it can't be a static Tailwind class */}
                    <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <PanelState loading={payers.loading} error={payers.error} empty="No sessions in the last year." />
        )}
      </PanelSection>

      <PanelSection title="Recent sessions">
        {recent.rows?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.rows.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="whitespace-nowrap">{formatDay(String(r.session_datetime))}</TableCell>
                  <TableCell className="max-w-32 truncate">{r.payer}</TableCell>
                  <TableCell>{r.session_code}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(Number(r.amount), true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <PanelState loading={recent.loading} error={recent.error} empty="No sessions logged yet." />
        )}
      </PanelSection>
    </div>
  );
}
