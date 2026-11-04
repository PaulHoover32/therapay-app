import type { SupabaseClient } from "@supabase/supabase-js";

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

/** The rate in force for a payer/platform/code in a month (latest effective_from on or before it). */
export function rateFor(rates: RateLite[], v: { payer: string; platform: string; cpt_code: string }, ym: string) {
  const match = rates
    .filter((r) => r.payer === v.payer && r.platform === v.platform && r.cpt_code === v.cpt_code && month(r.effective_from) <= ym)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  return match ? Number(match.rate) : null;
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

export interface Levers {
  dollars_per_month_needed?: number;
  blended_rate?: { rate: number; weighted: boolean; sessions: number; basis: string };
  sessions_per_month_needed?: number;
  payer_mix?: { highest: RateRef; lowest: RateRef; what_if: string };
  no_show_cost_last_3_months?: { no_shows: number; late_cancels: number; dollars: number };
  weeks_off_affordable?: number;
}

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

  const base = {
    as_of: today,
    settled_through: settledMonths.length ? monthLabel(settled.month) : null,
    payout_lag_days: settled.lag,
    last_year_total: lastYearTotal,
    in_progress: inProgress,
    next_payouts: nextPayouts,
    target,
    target_source: targetSource,
  };

  if (!settledMonths.length) {
    notes.unshift(`Too early in ${year} to pace: January settles around ${settled.settlesOn(`${year}-01`)}.`);
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

    const ym = month(today);
    const recentMonths = [1, 2, 3].map((i) => shiftMonth(ym, -i));
    const blend = blendedRate(rates, volumes, recentMonths, ym);
    if (blend) {
      levers.blended_rate = { ...blend, basis: blend.weighted ? "your last 3 months of counts" : "your rate card (no counts yet)" };
      levers.sessions_per_month_needed = Math.ceil(perMonth / blend.rate);
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
      .select("payout_date, amount, payer, status, period_start, period_end")
      .eq("therapist_id", therapistId)
      .gte("payout_date", from)
      .order("payout_date")
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as PayoutLite[]));
    if (!data || data.length < 1000) return rows;
  }
}
