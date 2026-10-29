import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlatforms } from "@/lib/payouts";

// Reconciliation compares work performed (sessions → expected) with cash received (payouts)
// per payer per period. It never edits either side; it only reports the gap.
//
// A session is keyed by the platform that paid it (Grow Therapy, Headway, …) when known,
// otherwise by its payer (Aetna, Cash, …). Payouts are keyed by their payer.
// A payout counts toward the period of the work it covers: its period_start/period_end when
// given, otherwise its payout date minus the payer's typical payout lag.

export type Granularity = "month" | "week";

export interface ReconSession {
  session_datetime: string;
  amount: number;
  payer: string;
  platform: string | null;
}

export interface ReconPayout {
  payout_date: string;
  amount: number;
  payer: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
}

export type ReconStatus =
  | "matched"
  | "underpaid"
  | "overpaid_or_unlogged_sessions"
  | "payout_missing"
  | "awaiting_payout"
  | "sessions_missing";

export interface ReconRow {
  payer: string;
  period: string;
  period_label: string;
  expected: number;
  received: number;
  pending: number;
  difference: number;
  status: ReconStatus;
  session_count: number;
  payout_count: number;
  session_metrics_available: boolean;
  note: string;
}

const LAG_BY_PAYMENT_OPTION: Record<string, number> = { insurance: 21, eap: 30, "self-pay": 2, "sliding-scale": 2 };
const DEFAULT_LAG = 14;
const MAX_LAG = 120;
const PAGE = 1000;

const round = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function utcDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`);
}

function addDays(date: string, days: number) {
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First day of the month or (Monday-start) week containing `date`. */
export function periodStart(date: string, granularity: Granularity) {
  if (granularity === "month") return `${date.slice(0, 7)}-01`;
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function periodEnd(start: string, granularity: Granularity) {
  if (granularity === "week") return addDays(start, 6);
  const d = utcDate(start);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

function periodLabel(start: string, granularity: Granularity) {
  const d = utcDate(start);
  if (granularity === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

/** The date whose period a payout's money belongs to. */
export function workDate(p: ReconPayout, lagDays: number) {
  if (p.period_start && p.period_end) {
    const a = utcDate(p.period_start).getTime();
    const b = utcDate(p.period_end).getTime();
    return new Date((a + b) / 2).toISOString().slice(0, 10);
  }
  return p.period_start ?? p.period_end ?? addDays(p.payout_date, -lagDays);
}

export function reconcile({
  sessions,
  payouts,
  lagFor,
  start,
  end,
  payers,
  granularity = "month",
  today = new Date().toISOString().slice(0, 10),
}: {
  sessions: ReconSession[];
  payouts: ReconPayout[];
  lagFor: (payer: string) => number;
  start: string;
  end: string;
  payers?: string[];
  granularity?: Granularity;
  today?: string;
}) {
  const first = periodStart(start, granularity);
  const last = periodStart(end, granularity);
  const wanted = payers?.length ? new Set(payers.map((p) => p.toLowerCase())) : null;
  const cells = new Map<string, { payer: string; period: string; expected: number; received: number; pending: number; sessions: number; payouts: number }>();

  const cell = (key: string, period: string) => {
    if (period < first || period > last) return null;
    if (wanted && !wanted.has(key.toLowerCase())) return null;
    const id = `${key}|${period}`;
    let c = cells.get(id);
    if (!c) cells.set(id, (c = { payer: key, period, expected: 0, received: 0, pending: 0, sessions: 0, payouts: 0 }));
    return c;
  };

  for (const s of sessions) {
    const c = cell(s.platform ?? s.payer, periodStart(s.session_datetime.slice(0, 10), granularity));
    if (!c) continue;
    c.expected += Number(s.amount);
    c.sessions += 1;
  }
  for (const p of payouts) {
    if (p.status === "failed" || p.status === "reversed") continue;
    const c = cell(p.payer, periodStart(workDate(p, lagFor(p.payer)), granularity));
    if (!c) continue;
    if (p.status === "pending") c.pending += Number(p.amount);
    else c.received += Number(p.amount);
    c.payouts += 1;
  }

  const rows: ReconRow[] = [...cells.values()]
    .sort((a, b) => a.period.localeCompare(b.period) || a.payer.localeCompare(b.payer))
    .map((c) => {
      const expected = round(c.expected);
      const received = round(c.received);
      const difference = round(received - expected);
      const tolerance = Math.max(5, expected * 0.02);
      const label = periodLabel(c.period, granularity);
      const stillArriving = addDays(periodEnd(c.period, granularity), lagFor(c.payer)) >= today;
      const where = `${c.payer}, ${label}`;

      let status: ReconStatus;
      let note: string;
      if (expected === 0) {
        status = "sessions_missing";
        note = `${where}: ${usd(received + c.pending)} paid out but no sessions logged. Income totals still count it; per-session metrics aren't available for this period.`;
      } else if (received === 0) {
        status = stillArriving ? "awaiting_payout" : "payout_missing";
        note = stillArriving
          ? `${where}: ${usd(expected)} expected; payouts for this period may still be on the way.`
          : `${where}: ${usd(expected)} expected but no payouts recorded.`;
      } else if (Math.abs(difference) <= tolerance) {
        status = "matched";
        note = `${where}: matched (${usd(received)} received vs ${usd(expected)} expected).`;
      } else if (difference < 0) {
        status = stillArriving ? "awaiting_payout" : "underpaid";
        note = `${where}: ${usd(difference)} more expected than received${stillArriving ? " so far; more may still arrive" : ""}.`;
      } else {
        status = "overpaid_or_unlogged_sessions";
        note = `${where}: ${usd(difference)} more received than expected; sessions may be missing from the log.`;
      }

      return {
        payer: c.payer,
        period: c.period,
        period_label: label,
        expected,
        received,
        pending: round(c.pending),
        difference,
        status,
        session_count: c.sessions,
        payout_count: c.payouts,
        session_metrics_available: c.sessions > 0,
        note,
      };
    });

  const expected_total = round(rows.reduce((t, r) => t + r.expected, 0));
  const received_total = round(rows.reduce((t, r) => t + r.received, 0));
  // Best available income: cash received where we have payouts, logged sessions where we don't.
  // Each payer-period counts once, so sessions and payouts are never added together.
  const income_total = round(rows.reduce((t, r) => t + (r.received > 0 ? r.received : r.expected), 0));

  return {
    granularity,
    start: first,
    end: periodEnd(last, granularity),
    totals: { expected: expected_total, received: received_total, difference: round(received_total - expected_total), income: income_total },
    rows,
  };
}

/** Typical payout lag per payer: platform table first, then the payer's payment option. */
export async function getLagLookup(supabase: SupabaseClient) {
  const [platforms, { data: payers }] = await Promise.all([
    getPlatforms(supabase),
    supabase.from("reference_payers").select("name, payment_option").eq("active", true),
  ]);
  const lags = new Map<string, number>();
  for (const p of payers ?? []) lags.set(p.name.toLowerCase(), LAG_BY_PAYMENT_OPTION[p.payment_option] ?? DEFAULT_LAG);
  for (const p of platforms) lags.set(p.name.toLowerCase(), p.payout_lag_days);
  return (payer: string) => lags.get(payer.toLowerCase()) ?? DEFAULT_LAG;
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Load sessions and payouts around [start, end] and reconcile them, optionally as if `extra` rows were saved. */
export async function loadReconciliation(
  supabase: SupabaseClient,
  therapistId: string,
  opts: {
    start: string;
    end: string;
    payers?: string[];
    granularity?: Granularity;
    extra?: { sessions?: ReconSession[]; payouts?: ReconPayout[] };
  }
) {
  const granularity = opts.granularity ?? "month";
  const from = periodStart(opts.start, granularity);
  const to = addDays(periodEnd(periodStart(opts.end, granularity), granularity), 1);
  const [lagFor, sessions, payouts] = await Promise.all([
    getLagLookup(supabase),
    fetchAll<ReconSession>((a, b) =>
      supabase
        .from("sessions")
        .select("session_datetime, amount, payer, platform")
        .eq("therapist_id", therapistId)
        .gte("session_datetime", from)
        .lt("session_datetime", to)
        .order("session_datetime")
        .range(a, b)
    ),
    // Payouts for work in the range can land up to MAX_LAG days after it ends
    fetchAll<ReconPayout>((a, b) =>
      supabase
        .from("payouts")
        .select("payout_date, amount, payer, status, period_start, period_end")
        .eq("therapist_id", therapistId)
        .gte("payout_date", from)
        .lt("payout_date", addDays(to, MAX_LAG))
        .order("payout_date")
        .range(a, b)
    ),
  ]);
  return reconcile({
    sessions: [...sessions, ...(opts.extra?.sessions ?? [])],
    payouts: [...payouts, ...(opts.extra?.payouts ?? [])],
    lagFor,
    start: opts.start,
    end: opts.end,
    payers: opts.payers,
    granularity,
  });
}
