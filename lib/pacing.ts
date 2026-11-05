import type { SupabaseClient } from "@supabase/supabase-js";
import { groupDuplicates, likelyDuplicatePairs, type DupGroup } from "@/lib/imports";

// "Am I on track?" math. Income comes from payouts ONLY (cash received). The rate card and
// monthly counts never add to income: they only price levers (sessions needed, payer mix,
// no-show cost). Everything is monthly; a month counts once its money has had time to arrive.

export interface PayoutLite {
  payout_date: string;
  amount: number;
  payer: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  import_batch_id?: string | null;
  external_id?: string | null;
}

export interface RateLite {
  payer: string;
  platform: string;
  cpt_code: string;
  rate: number;
  effective_from: string;
}

export interface VolumeLite {
  month: string;
  payer: string;
  platform: string;
  cpt_code: string;
  completed: number;
  no_shows: number;
  late_cancels: number;
  late_cancel_fee: number;
}

export type LagFor = (entity: string) => number;

const LAG_BY_PAYMENT_OPTION: Record<string, number> = { insurance: 18, eap: 30, "self-pay": 7, "sliding-scale": 7 };
export const DEFAULT_LAG = 14;
const WEEKS_PER_MONTH = 4.33;

const round = (n: number) => Math.round(n * 100) / 100;
const utc = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const month = (date: string) => date.slice(0, 7);

export function addDays(date: string, days: number) {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

function monthEnd(ym: string) {
  const d = utc(`${ym}-01`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return iso(d);
}

function shiftMonth(ym: string, by: number) {
  const d = utc(`${ym}-01`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return month(iso(d));
}

const monthLabel = (ym: string) => utc(`${ym}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** The date whose month a payout's money belongs to: its stated period, else payout date minus lag. */
export function workDate(p: PayoutLite, lag: number) {
  if (p.period_start && p.period_end) {
    return iso(new Date((utc(p.period_start).getTime() + utc(p.period_end).getTime()) / 2));
  }
  return p.period_start ?? p.period_end ?? addDays(p.payout_date, -lag);
}

/** Paid payouts summed by work month (YYYY-MM). Failed, reversed and pending payouts don't count. */
export function monthlyIncome(payouts: PayoutLite[], lagFor: LagFor) {
  const byMonth = new Map<string, number>();
  for (const p of payouts) {
    if (p.status !== "paid") continue;
    const m = month(workDate(p, lagFor(p.payer)));
    byMonth.set(m, round((byMonth.get(m) ?? 0) + Number(p.amount)));
  }
  return byMonth;
}

/**
 * Last fully settled month: a month is settled once month_end + L < today, where L is the
 * longest typical lag among entities that paid in the last 12 months (fallback DEFAULT_LAG).
 * Every entity's money in a month moves together, so a month is never half-counted.
 */
export function settledThrough(payouts: PayoutLite[], lagFor: LagFor, today: string) {
  const since = addDays(today, -365);
  const recent = new Set(payouts.filter((p) => p.payout_date >= since).map((p) => p.payer));
  const lag = recent.size ? Math.max(...[...recent].map(lagFor)) : DEFAULT_LAG;
  let m = month(today);
  while (addDays(monthEnd(m), lag) >= today) m = shiftMonth(m, -1);
  return { month: m, lag, settlesOn: (ym: string) => addDays(monthEnd(ym), lag + 1) };
}

/**
 * The rate in force for a payer/platform/code in a month: the latest effective_from on or before
 * it. Months before the first rate on file use that first rate (a rate card entered today
 * describes what she's been paid, unless a later row records a change).
 */
export function rateFor(rates: RateLite[], v: { payer: string; platform: string; cpt_code: string }, ym: string) {
  const forKey = rates
    .filter((r) => r.payer === v.payer && r.platform === v.platform && r.cpt_code === v.cpt_code)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  if (!forKey.length) return null;
  const inForce = forKey.filter((r) => month(r.effective_from) <= ym).pop() ?? forKey[0];
  return Number(inForce.rate);
}

/** Current rate per payer/platform/code (latest effective_from on or before this month). */
export function currentRates(rates: RateLite[], ym: string) {
  const keys = new Map<string, RateLite>();
  for (const r of rates) {
    if (month(r.effective_from) > ym) continue;
    const k = `${r.payer}|${r.platform}|${r.cpt_code}`;
    const prev = keys.get(k);
    if (!prev || r.effective_from > prev.effective_from) keys.set(k, r);
  }
  return [...keys.values()];
}

/** Volume-weighted average rate over the given months; unweighted current-rate average without counts. */
export function blendedRate(rates: RateLite[], volumes: VolumeLite[], months: string[], ym: string) {
  let dollars = 0;
  let sessions = 0;
  for (const v of volumes) {
    if (!months.includes(month(v.month)) || !v.cpt_code || !v.completed) continue;
    const r = rateFor(rates, v, month(v.month));
    if (r === null) continue;
    dollars += r * v.completed;
    sessions += v.completed;
  }
  if (sessions) return { rate: round(dollars / sessions), weighted: true, sessions };
  const current = currentRates(rates, ym);
  if (!current.length) return null;
  return { rate: round(current.reduce((t, r) => t + Number(r.rate), 0) / current.length), weighted: false, sessions: 0 };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Next 1–2 expected payouts per entity from its last 4: median amount, median gap, usual weekday. */
export function forecastPayouts(payouts: PayoutLite[], today: string, perEntity = 2) {
  const byEntity = new Map<string, PayoutLite[]>();
  for (const p of payouts) if (p.status === "paid") byEntity.set(p.payer, [...(byEntity.get(p.payer) ?? []), p]);
  const out: { payer: string; expected_date: string; expected_amount: number }[] = [];
  for (const [payer, list] of byEntity) {
    const last = list.sort((a, b) => a.payout_date.localeCompare(b.payout_date)).slice(-4);
    if (last.length < 2) continue;
    const gaps = last.slice(1).map((p, i) => (utc(p.payout_date).getTime() - utc(last[i].payout_date).getTime()) / 86400000);
    const gap = Math.max(1, Math.round(median(gaps)));
    // Too stale to forecast: nothing for more than three gaps
    if (addDays(last[last.length - 1].payout_date, gap * 3) < today) continue;
    const weekdays = last.map((p) => utc(p.payout_date).getUTCDay());
    const usual = weekdays.sort((a, b) => weekdays.filter((d) => d === b).length - weekdays.filter((d) => d === a).length)[0];
    const amount = round(median(last.map((p) => Number(p.amount))));
    let next = last[last.length - 1].payout_date;
    while (out.filter((o) => o.payer === payer).length < perEntity) {
      next = addDays(next, gap);
      if (gap >= 7) {
        const shift = (usual - utc(next).getUTCDay() + 7) % 7;
        next = addDays(next, shift > 3 ? shift - 7 : shift);
      }
      if (next > today) out.push({ payer, expected_date: next, expected_amount: amount });
    }
  }
  return out.sort((a, b) => a.expected_date.localeCompare(b.expected_date));
}

interface RateRef {
  payer: string;
  platform: string | null;
  cpt_code: string;
  rate: number;
}

/**
 * Sessions framed as current vs needed, never as one bare number: "needed" is her TOTAL monthly
 * volume to hit the target, so it only means something next to what she does now.
 */
export interface SessionsFraming {
  /** Recent payouts per month ÷ blended rate: roughly what she's doing now */
  current_per_month: number;
  /** Total sessions a month for the rest of the year to reach the target */
  needed_per_month: number;
  extra_per_month: number;
  extra_pct: number | null;
  summary: string;
}

export interface Levers {
  /** Total payouts a month needed for the rest of the year (not on top of her current pace) */
  dollars_per_month_needed?: number;
  current_dollars_per_month?: number;
  extra_dollars_per_month?: number;
  blended_rate?: { rate: number; weighted: boolean; sessions: number; basis: string };
  sessions?: SessionsFraming;
  payer_mix?: { highest: RateRef; lowest: RateRef; what_if: string };
  no_show_cost_last_3_months?: { no_shows: number; late_cancels: number; dollars: number };
  weeks_off_affordable?: number;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Current vs needed sessions a month at the blended rate, with the gap in sessions and percent. */
export function sessionsFraming(pace: number, perMonth: number, rate: number, target: number): SessionsFraming {
  const current = Math.round(pace / rate);
  const needed = Math.ceil(perMonth / rate);
  const extra = Math.max(0, needed - current);
  const extraPct = current ? Math.round((extra / current) * 100) : null;
  const now = `Recent payouts work out to about ${current} sessions a month at your $${rate} blended rate.`;
  return {
    current_per_month: current,
    needed_per_month: needed,
    extra_per_month: extra,
    extra_pct: extraPct,
    summary: extra
      ? `${now} Reaching ${usd(target)} needs about ${needed} a month for the rest of the year: about ${extra} more than now${extraPct !== null ? ` (+${extraPct}%)` : ""}.`
      : `${now} Reaching ${usd(target)} needs about ${needed} a month for the rest of the year, which your current pace already covers.`,
  };
}

export interface CountsCheck {
  month: string;
  sessions: number;
  counts_times_rates: number;
  payouts: number;
  difference_pct: number;
  settled: boolean;
}

export const COUNTS_MISMATCH = 0.25;

/**
 * Compares logged counts × rate card with payouts for the same work months (last 6). Settled
 * months are flagged either way past 25%; months still arriving only when payouts already exceed
 * the counts (less is expected while money is in flight). A data-quality hint only: income never
 * uses counts.
 */
export function countsVsPayouts(rates: RateLite[], volumes: VolumeLite[], income: Map<string, number>, settledMonth: string, today: string): CountsCheck[] {
  const byMonth = new Map<string, { dollars: number; sessions: number; unpriced: number }>();
  const earliest = shiftMonth(month(today), -6);
  for (const v of volumes) {
    const ym = month(v.month);
    if (ym < earliest || ym > month(today) || !v.cpt_code || !v.completed) continue;
    const g = byMonth.get(ym) ?? { dollars: 0, sessions: 0, unpriced: 0 };
    const r = rateFor(rates, v, ym);
    if (r === null) g.unpriced += v.completed;
    else {
      g.dollars += r * v.completed;
      g.sessions += v.completed;
    }
    byMonth.set(ym, g);
  }
  const checks: CountsCheck[] = [];
  for (const [ym, g] of [...byMonth].sort(([a], [b]) => a.localeCompare(b))) {
    if (!g.dollars || g.unpriced) continue; // can't compare a month with sessions the rate card doesn't price
    const paid = income.get(ym) ?? 0;
    const diff = (paid - g.dollars) / g.dollars;
    const settled = ym <= settledMonth;
    if (settled ? Math.abs(diff) > COUNTS_MISMATCH : diff > COUNTS_MISMATCH) {
      checks.push({ month: monthLabel(ym), sessions: g.sessions, counts_times_rates: round(g.dollars), payouts: paid, difference_pct: Math.round(diff * 100), settled });
    }
  }
  return checks;
}

function countsNote(c: CountsCheck) {
  const more = c.payouts > c.counts_times_rates;
  return (
    `${c.month}: logged counts (${c.sessions} sessions) × your rate card come to ${usd(c.counts_times_rates)}, but payouts for that month ` +
    `${c.settled ? "are" : "already total"} ${usd(c.payouts)} (${more ? "+" : ""}${c.difference_pct}%). ` +
    (more
      ? "Likely causes: sessions not logged for some payers, rates set too low, or the same payouts imported twice. "
      : "Likely causes: rates set too high, counts logged for the wrong month, or payouts missing from an import. ") +
    "Ask the user which it is. Income still comes from payouts only."
  );
}

/** Paid payouts that look like the same money imported twice, grouped by the two imports involved. */
export function duplicatePayouts(payouts: PayoutLite[]): DupGroup[] {
  const rows = payouts
    .filter((p) => p.status === "paid")
    .map((p) => ({ payer: p.payer, date: p.payout_date, amount: Number(p.amount), batch: p.import_batch_id ?? null, external_id: p.external_id ?? null }));
  return groupDuplicates(likelyDuplicatePairs(rows));
}

const batchName = (b: string | null) => (b ? `import ${b}` : "payouts added without an import");

function duplicateNote(g: DupGroup) {
  return (
    `${g.count} payouts in ${batchName(g.batches[0])} match payouts in ${batchName(g.batches[1])} (same payer and amount, ` +
    `≤4 days apart, ${formatShort(g.from)}–${formatShort(g.to)}), ${usd(g.total)} in all. If they're the same money, every figure here ` +
    `is inflated by up to that much. ` +
    (g.likely_extra
      ? `The copy in import ${g.likely_extra} has no Stripe payout IDs, so it's the likely extra: confirm with the user, then undo_import ${g.likely_extra}.`
      : "Confirm with the user which import is the extra copy, then undo_import it.") +
    " Nothing has been deleted."
  );
}

const formatShort = (d: string) => utc(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export interface CheckInInput {
  payouts: PayoutLite[];
  lagFor: LagFor;
  goal: number | null;
  rates: RateLite[];
  volumes: VolumeLite[];
  today: string;
}

export function computeCheckIn({ payouts, lagFor, goal, rates, volumes, today }: CheckInInput) {
  const year = Number(today.slice(0, 4));
  const income = monthlyIncome(payouts, lagFor);
  const settled = settledThrough(payouts, lagFor, today);
  const notes: string[] = [];
  const get = (ym: string) => income.get(ym) ?? 0;
  const lastYearMonths = Array.from({ length: 12 }, (_, i) => `${year - 1}-${String(i + 1).padStart(2, "0")}`);
  const lastYearTotal = round(lastYearMonths.reduce((t, m) => t + get(m), 0));
  const lastYearComplete = lastYearMonths.every((m) => get(m) > 0);

  // Months of this year that are settled, and the unsettled ones through the current month
  const settledMonths: string[] = [];
  for (let m = `${year}-01`; m <= settled.month && m.startsWith(String(year)); m = shiftMonth(m, 1)) settledMonths.push(m);
  const inProgressMonths: string[] = [];
  for (let m = settledMonths.length ? shiftMonth(settled.month, 1) : `${year}-01`; m <= month(today); m = shiftMonth(m, 1)) inProgressMonths.push(m);

  const ytd = round(settledMonths.reduce((t, m) => t + get(m), 0));
  const sameMonthsLastYear = settledMonths.map((m) => `${year - 1}${m.slice(4)}`);
  const ytdLastYear = round(sameMonthsLastYear.reduce((t, m) => t + get(m), 0));

  const paceMonths = settledMonths.slice(-3);
  const pace = paceMonths.length ? round(paceMonths.reduce((t, m) => t + get(m), 0) / paceMonths.length) : null;
  const paceLastYear = paceMonths.length
    ? round(paceMonths.map((m) => get(`${year - 1}${m.slice(4)}`)).reduce((t, x) => t + x, 0) / paceMonths.length)
    : null;

  const receivedSoFar = round(inProgressMonths.reduce((t, m) => t + get(m), 0));
  const inProgress = {
    months: inProgressMonths.map(monthLabel),
    received_so_far: receivedSoFar,
    // Expected at her recent pace (current month prorated by day), minus what has already arrived
    still_arriving_estimate:
      pace === null
        ? null
        : round(
            Math.max(
              0,
              inProgressMonths.reduce((t, m) => {
                const share = m === month(today) ? Number(today.slice(8, 10)) / Number(monthEnd(m).slice(8, 10)) : 1;
                return t + pace * share;
              }, 0) - receivedSoFar
            )
          ),
  };
  const nextPayouts = forecastPayouts(payouts, today);

  const target = goal ?? (lastYearComplete ? lastYearTotal : null);
  const targetSource = goal !== null ? "goal" : target !== null ? "last_year" : null;
  if (goal === null && target !== null) notes.push(`No goal set for ${year}: comparing against last year's total (${lastYearTotal}). Offer set_goal.`);
  if (target === null) notes.push(`No goal set and last year's payouts are incomplete: suggest set_goal with a dollar amount, or importing last year's payouts.`);
  if (!lastYearComplete) notes.push(`Last year (${year - 1}) doesn't have payouts in every month, so year-over-year comparisons are partial. Importing ${year - 1} payouts fixes this.`);

  // Data-quality checks: flagged for the user to resolve, never applied to the figures
  const duplicates = duplicatePayouts(payouts);
  const countsChecks = countsVsPayouts(rates, volumes, income, settled.month, today);
  notes.unshift(...duplicates.map(duplicateNote));
  notes.push(...countsChecks.map(countsNote));
  const dataChecks = { duplicate_payouts: duplicates, counts_vs_payouts: countsChecks };

  const base = {
    as_of: today,
    settled_through: settledMonths.length ? monthLabel(settled.month) : null,
    payout_lag_days: settled.lag,
    last_year_total: lastYearTotal,
    in_progress: inProgress,
    next_payouts: nextPayouts,
    target,
    target_source: targetSource,
    data_checks: dataChecks,
  };

  if (!settledMonths.length) {
    notes.splice(duplicates.length, 0, `Too early in ${year} to pace: January settles around ${settled.settlesOn(`${year}-01`)}.`);
    return {
      ...base,
      last_year_start: { january: get(`${year - 1}-01`), february: get(`${year - 1}-02`) },
      data_notes: notes,
    };
  }

  const monthsRemaining = 12 - settledMonths.length;
  let projected: number | null = null;
  let projectionMethod: string | null = null;
  const share = lastYearTotal ? ytdLastYear / lastYearTotal : 0;
  if (lastYearComplete && share > 0) {
    projected = round(ytd / share);
    projectionMethod = "seasonal (follows last year's pattern)";
  } else if (settledMonths.length >= 3 && pace !== null) {
    projected = round(ytd + pace * monthsRemaining);
    projectionMethod = "run-rate (no seasonality data)";
  } else {
    notes.push("Not enough settled months for a projection yet.");
  }

  const gap = target !== null && projected !== null ? round(target - projected) : null;
  const levers: Levers = {};
  if (target !== null && monthsRemaining > 0) {
    const perMonth = round(Math.max(0, target - ytd) / monthsRemaining);
    levers.dollars_per_month_needed = perMonth;
    if (pace !== null) {
      levers.current_dollars_per_month = pace;
      levers.extra_dollars_per_month = round(Math.max(0, perMonth - pace));
    }

    const ym = month(today);
    const recentMonths = [1, 2, 3].map((i) => shiftMonth(ym, -i));
    const blend = blendedRate(rates, volumes, recentMonths, ym);
    if (blend) {
      levers.blended_rate = { ...blend, basis: blend.weighted ? "your last 3 months of counts" : "your rate card (no counts yet)" };
      if (pace !== null) levers.sessions = sessionsFraming(pace, perMonth, blend.rate, target);
    } else {
      notes.push("No rate card yet: set_rate_card unlocks sessions-needed and payer-mix levers.");
    }

    const current = currentRates(rates, ym);
    if (current.length >= 2) {
      const sorted = [...current].sort((a, b) => Number(b.rate) - Number(a.rate));
      const hi = sorted[0];
      const lo = sorted[sorted.length - 1];
      if (Number(hi.rate) > Number(lo.rate)) {
        levers.payer_mix = {
          highest: { payer: hi.payer, platform: hi.platform || null, cpt_code: hi.cpt_code, rate: Number(hi.rate) },
          lowest: { payer: lo.payer, platform: lo.platform || null, cpt_code: lo.cpt_code, rate: Number(lo.rate) },
          what_if: `Moving 2 sessions a month from ${lo.payer} ${lo.cpt_code} to ${hi.payer} ${hi.cpt_code} adds about $${round(
            (Number(hi.rate) - Number(lo.rate)) * 2 * monthsRemaining
          )} over the rest of the year.`,
        };
      }
    }

    const recent = volumes.filter((v) => recentMonths.includes(month(v.month)));
    const noShows = recent.reduce((t, v) => t + v.no_shows, 0);
    const lateCancels = recent.reduce((t, v) => t + v.late_cancels, 0);
    if (blend && (noShows || lateCancels)) {
      const lateFees = recent.reduce((t, v) => t + v.late_cancels * Number(v.late_cancel_fee), 0);
      levers.no_show_cost_last_3_months = { no_shows: noShows, late_cancels: lateCancels, dollars: round(Math.max(0, (noShows + lateCancels) * blend.rate - lateFees)) };
    }

    if (projected !== null && pace && projected > target) {
      levers.weeks_off_affordable = round(Math.max(0, (projected - target) / (pace / WEEKS_PER_MONTH)));
    }
  }

  return {
    ...base,
    ytd,
    ytd_last_year_same_months: ytdLastYear,
    ytd_change_pct: ytdLastYear ? round(((ytd - ytdLastYear) / ytdLastYear) * 100) : null,
    pace_per_month: pace,
    pace_last_year_same_months: paceLastYear,
    pace_months: paceMonths.length,
    projected_year_end: projected,
    projection_method: projectionMethod,
    gap_to_target: gap,
    on_track: gap === null ? null : gap <= 0,
    levers,
    data_notes: notes,
  };
}

/** Typical payout lag per paying entity: platform table first, then the payer's payment option. */
export async function getLagLookup(supabase: SupabaseClient): Promise<LagFor> {
  const [{ data: platforms }, { data: payers }] = await Promise.all([
    supabase.from("reference_platforms").select("name, payout_lag_days").eq("active", true),
    supabase.from("reference_payers").select("name, payment_option").eq("active", true),
  ]);
  const lags = new Map<string, number>();
  for (const p of payers ?? []) lags.set(p.name.toLowerCase(), LAG_BY_PAYMENT_OPTION[p.payment_option] ?? DEFAULT_LAG);
  for (const p of platforms ?? []) lags.set(p.name.toLowerCase(), p.payout_lag_days);
  return (entity: string) => lags.get(entity.toLowerCase()) ?? DEFAULT_LAG;
}

/** All payouts from Jan 1 of last year through today, paginated past PostgREST's row cap. */
export async function loadPayoutsForPacing(supabase: SupabaseClient, therapistId: string, today: string) {
  const from = `${Number(today.slice(0, 4)) - 1}-01-01`;
  const rows: PayoutLite[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("payouts")
      .select("payout_date, amount, payer, status, period_start, period_end, import_batch_id, external_id")
      .eq("therapist_id", therapistId)
      .gte("payout_date", from)
      .order("payout_date")
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as PayoutLite[]));
    if (!data || data.length < 1000) return rows;
  }
}
