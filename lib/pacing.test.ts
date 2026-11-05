import { describe, expect, it } from "vitest";
import {
  blendedRate,
  computeCheckIn,
  countsVsPayouts,
  duplicatePayouts,
  sessionsFraming,
  forecastPayouts,
  monthlyIncome,
  rateFor,
  settledThrough,
  type PayoutLite,
  type RateLite,
  type VolumeLite,
} from "@/lib/pacing";

const lagFor = () => 14;

// computeCheckIn returns a shorter shape before any month has settled; narrow to the full one
function paced(r: ReturnType<typeof computeCheckIn>) {
  if (!("ytd" in r)) throw new Error("expected a paced result");
  return r;
}
const pad = (n: number) => String(n).padStart(2, "0");

// One payout on the 15th of each month: minus the 14-day lag it attributes to that same month
function monthly(year: number, months: number[], amount: number, payer = "Grow Therapy"): PayoutLite[] {
  return months.map((m) => ({ payout_date: `${year}-${pad(m)}-15`, amount, payer, status: "paid", period_start: null, period_end: null }));
}
const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);

describe("settledThrough", () => {
  it("counts a month only after its last day plus the lag has passed", () => {
    const payouts = monthly(2026, [9, 10], 1000);
    expect(settledThrough(payouts, lagFor, "2026-11-04").month).toBe("2026-09");
    expect(settledThrough(payouts, lagFor, "2026-11-15").month).toBe("2026-10");
  });

  it("uses the longest lag among recent payers and falls back to 14 days", () => {
    const payouts = [...monthly(2026, [9], 1000), ...monthly(2026, [9], 500, "EAP")];
    const lag = (e: string) => (e === "EAP" ? 30 : 14);
    expect(settledThrough(payouts, lag, "2026-11-04")).toMatchObject({ month: "2026-09", lag: 30 });
    expect(settledThrough([], lagFor, "2026-11-04").lag).toBe(14);
  });
});

describe("monthlyIncome", () => {
  it("attributes by payout date minus lag, prefers a stated period, and skips unpaid payouts", () => {
    const income = monthlyIncome(
      [
        { payout_date: "2026-03-10", amount: 300, payer: "Grow Therapy", status: "paid", period_start: null, period_end: null },
        { payout_date: "2026-03-10", amount: 200, payer: "Grow Therapy", status: "paid", period_start: "2026-03-01", period_end: "2026-03-07" },
        { payout_date: "2026-03-10", amount: 999, payer: "Grow Therapy", status: "failed", period_start: null, period_end: null },
        { payout_date: "2026-03-10", amount: 999, payer: "Grow Therapy", status: "pending", period_start: null, period_end: null },
      ],
      lagFor
    );
    expect(income.get("2026-02")).toBe(300);
    expect(income.get("2026-03")).toBe(200);
  });
});

describe("computeCheckIn", () => {
  const lastYear = monthly(2025, allMonths, 1000);
  const thisYear = monthly(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1100);
  const rates: RateLite[] = [
    { payer: "Aetna", platform: "Grow Therapy", cpt_code: "90837", rate: 150, effective_from: "2026-01-01" },
    { payer: "Cigna / Evernorth", platform: "Grow Therapy", cpt_code: "90834", rate: 100, effective_from: "2026-01-01" },
  ];

  it("never adds rate card or counts into income", () => {
    const volumes: VolumeLite[] = ["2026-08-01", "2026-09-01", "2026-10-01"].map((month) => ({
      month, payer: "Aetna", platform: "Grow Therapy", cpt_code: "90837", completed: 40, no_shows: 0, late_cancels: 0, late_cancel_fee: 0,
    }));
    const base = { payouts: [...lastYear, ...thisYear], lagFor, goal: null, today: "2026-11-04" };
    const without = paced(computeCheckIn({ ...base, rates: [], volumes: [] }));
    const withInputs = computeCheckIn({ ...base, rates, volumes });
    expect(withInputs).toMatchObject({ ytd: 9900, projected_year_end: without.projected_year_end });
    expect(without).toMatchObject({ ytd: 9900 });
  });

  it("projects seasonally from a complete last year and reports pace and the goal gap", () => {
    const r = paced(computeCheckIn({ payouts: [...lastYear, ...thisYear], lagFor, goal: 13000, rates, volumes: [], today: "2026-11-04" }));
    expect(r).toMatchObject({
      settled_through: "September 2026",
      ytd: 9900,
      ytd_last_year_same_months: 9000,
      ytd_change_pct: 10,
      pace_per_month: 1100,
      pace_months: 3,
      projected_year_end: 13200,
      target: 13000,
      target_source: "goal",
      gap_to_target: -200,
      on_track: true,
    });
    expect(r.projection_method).toMatch(/seasonal/);
    expect(r.levers).toHaveProperty("weeks_off_affordable");
  });

  it("uses last year's total as the target when no goal is set", () => {
    const r = computeCheckIn({ payouts: [...lastYear, ...thisYear], lagFor, goal: null, rates: [], volumes: [], today: "2026-11-04" });
    expect(r).toMatchObject({ target: 12000, target_source: "last_year" });
  });

  it("reports in-progress months separately and never counts them as behind", () => {
    const r = computeCheckIn({ payouts: [...lastYear, ...thisYear], lagFor, goal: 13000, rates: [], volumes: [], today: "2026-11-04" });
    expect(r.in_progress).toMatchObject({ months: ["October 2026", "November 2026"], received_so_far: 1100 });
    expect(r.in_progress.still_arriving_estimate).toBeGreaterThanOrEqual(0);
  });

  it("says it's too early when no month has settled yet", () => {
    const r = computeCheckIn({ payouts: lastYear, lagFor, goal: null, rates: [], volumes: [], today: "2026-01-20" });
    expect(r).not.toHaveProperty("ytd");
    expect(r.data_notes[0]).toMatch(/Too early/);
    expect(r).toMatchObject({ last_year_total: 12000, settled_through: null });
  });

  it("omits the projection with under 3 settled months and an incomplete last year", () => {
    const partialLastYear = monthly(2025, [6, 7, 8, 9, 10, 11, 12], 1000);
    const r = computeCheckIn({ payouts: [...partialLastYear, ...monthly(2026, [1, 2], 1000)], lagFor, goal: 12000, rates: [], volumes: [], today: "2026-03-20" });
    expect(r).toMatchObject({ pace_months: 2, projected_year_end: null, gap_to_target: null });
    expect(r.data_notes.join(" ")).toMatch(/Not enough settled months/);
  });

  it("prices levers from the rate card: sessions needed, payer-mix what-if and no-show cost", () => {
    const volumes: VolumeLite[] = [
      { month: "2026-10-01", payer: "Aetna", platform: "Grow Therapy", cpt_code: "90837", completed: 30, no_shows: 0, late_cancels: 0, late_cancel_fee: 0 },
      { month: "2026-10-01", payer: "Cigna / Evernorth", platform: "Grow Therapy", cpt_code: "90834", completed: 10, no_shows: 0, late_cancels: 0, late_cancel_fee: 0 },
      { month: "2026-10-01", payer: "Aetna", platform: "Grow Therapy", cpt_code: "", completed: 0, no_shows: 2, late_cancels: 1, late_cancel_fee: 25 },
    ];
    const r = paced(computeCheckIn({ payouts: [...lastYear, ...thisYear], lagFor, goal: 14000, rates, volumes, today: "2026-11-04" }));
    const levers = r.levers;
    expect(levers.dollars_per_month_needed).toBe(1366.67);
    expect(levers.blended_rate).toMatchObject({ rate: 137.5, weighted: true });
    expect(levers).toMatchObject({ current_dollars_per_month: 1100, extra_dollars_per_month: 266.67 });
    expect(levers.sessions).toMatchObject({ current_per_month: 8, needed_per_month: 10, extra_per_month: 2, extra_pct: 25 });
    expect(levers.payer_mix?.highest).toMatchObject({ payer: "Aetna", cpt_code: "90837" });
    expect(levers.payer_mix?.what_if).toContain("$300");
    expect(levers.no_show_cost_last_3_months).toMatchObject({ no_shows: 2, late_cancels: 1, dollars: 387.5 });
  });
});

describe("rates", () => {
  const rates: RateLite[] = [
    { payer: "Aetna", platform: "", cpt_code: "90837", rate: 140, effective_from: "2026-01-01" },
    { payer: "Aetna", platform: "", cpt_code: "90837", rate: 120, effective_from: "2026-07-01" },
  ];
  it("uses the rate in force for the month", () => {
    expect(rateFor(rates, { payer: "Aetna", platform: "", cpt_code: "90837" }, "2026-06")).toBe(140);
    expect(rateFor(rates, { payer: "Aetna", platform: "", cpt_code: "90837" }, "2026-08")).toBe(120);
    expect(rateFor(rates, { payer: "Aetna", platform: "", cpt_code: "90837" }, "2025-12")).toBe(140);
    expect(rateFor(rates, { payer: "Cigna", platform: "", cpt_code: "90837" }, "2026-08")).toBeNull();
  });
  it("weights by counts logged before the rate card was entered", () => {
    const enteredToday: RateLite[] = [{ payer: "Aetna", platform: "", cpt_code: "90837", rate: 150, effective_from: "2026-11-01" }];
    const october: VolumeLite[] = [{ month: "2026-10-01", payer: "Aetna", platform: "", cpt_code: "90837", completed: 30, no_shows: 0, late_cancels: 0, late_cancel_fee: 0 }];
    expect(blendedRate(enteredToday, october, ["2026-10"], "2026-11")).toMatchObject({ rate: 150, weighted: true, sessions: 30 });
  });
  it("falls back to an unweighted average of current rates without counts", () => {
    expect(blendedRate(rates, [], ["2026-10"], "2026-11")).toMatchObject({ rate: 120, weighted: false });
    expect(blendedRate([], [], ["2026-10"], "2026-11")).toBeNull();
  });
});

describe("forecastPayouts", () => {
  const fridays = ["2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"].map((d, i) => ({
    payout_date: d, amount: [480, 500, 520, 500][i], payer: "Grow Therapy", status: "paid", period_start: null, period_end: null,
  }));
  it("predicts the next payouts from the median amount and usual weekday", () => {
    expect(forecastPayouts(fridays, "2026-11-04")).toEqual([
      { payer: "Grow Therapy", expected_date: "2026-11-06", expected_amount: 500 },
      { payer: "Grow Therapy", expected_date: "2026-11-13", expected_amount: 500 },
    ]);
  });
  it("doesn't forecast a payer that has gone quiet", () => {
    expect(forecastPayouts(fridays, "2027-01-15")).toEqual([]);
  });
});

describe("sessions framing (current vs needed, never one bare number)", () => {
  it("pins the founder-shaped case: ~85 now, ~98 needed, ~13 more", () => {
    // Pace $8,335/mo, blended $97.58, $100k goal, settled through September with $71,374 YTD
    const perMonth = (100000 - 71374) / 3;
    const f = sessionsFraming(8335, perMonth, 97.58, 100000);
    expect(f).toMatchObject({ current_per_month: 85, needed_per_month: 98, extra_per_month: 13, extra_pct: 15 });
    expect(f.summary).toMatch(/about 85 sessions a month.*about 98 a month.*about 13 more than now \(\+15%\)/);
  });

  it("says the current pace already covers it when ahead", () => {
    const f = sessionsFraming(10000, 8000, 100, 90000);
    expect(f).toMatchObject({ current_per_month: 100, needed_per_month: 80, extra_per_month: 0 });
    expect(f.summary).toMatch(/already covers/);
  });

  it("frames sessions as a gap from the current pace inside check_in", () => {
    const payouts = [...monthly(2025, allMonths, 1000), ...monthly(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1100)];
    const rates: RateLite[] = [{ payer: "Aetna", platform: "", cpt_code: "90837", rate: 100, effective_from: "2026-01-01" }];
    const r = paced(computeCheckIn({ payouts, lagFor, goal: 14000, rates, volumes: [], today: "2026-11-04" }));
    expect(r.levers.sessions).toMatchObject({ current_per_month: 11, needed_per_month: 14, extra_per_month: 3 });
    expect(r.levers).not.toHaveProperty("sessions_per_month_needed");
  });
});

describe("duplicate payouts", () => {
  const p = (date: string, amount: number, batch: string | null, external_id: string | null = null, payer = "Grow Therapy"): PayoutLite => ({
    payout_date: date, amount, payer, status: "paid", period_start: null, period_end: null, import_batch_id: batch, external_id,
  });

  it("flags same payer and amount within 4 days across imports and names the copy without Stripe IDs", () => {
    const payouts = [
      p("2026-10-05", 812.4, "stripe", "po_1"), p("2026-10-02", 812.4, "typed"),
      p("2026-10-12", 790, "stripe", "po_2"), p("2026-10-09", 790, "typed"),
      p("2026-10-19", 500, "stripe", "po_3"), // no twin
    ];
    const [g, ...rest] = duplicatePayouts(payouts);
    expect(rest).toEqual([]);
    expect(g).toMatchObject({ count: 2, total: 1602.4, from: "2026-10-02", to: "2026-10-12", likely_extra: "typed" });
  });

  it("ignores repeats inside one import, gaps over 4 days, other payers and unpaid payouts", () => {
    const failed = { ...p("2026-10-03", 100, "b"), status: "failed" };
    const payouts = [
      p("2026-10-01", 100, "a"), p("2026-10-01", 100, "a"), // same import: legitimate
      p("2026-10-10", 200, "a"), p("2026-10-15", 200, "b"), // 5 days apart
      p("2026-10-20", 300, "a"), p("2026-10-20", 300, "b", null, "Alma"),
      failed,
    ];
    expect(duplicatePayouts(payouts)).toEqual([]);
  });

  it("puts the duplicate warning first in check_in data notes and never changes the totals", () => {
    const base = [...monthly(2025, allMonths, 1000), ...monthly(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1100)];
    const dup = { ...base[base.length - 2], payout_date: "2026-09-12", import_batch_id: "typed" };
    const r = paced(computeCheckIn({ payouts: [...base, dup], lagFor, goal: null, rates: [], volumes: [], today: "2026-11-04" }));
    expect(r.data_notes[0]).toMatch(/1 payouts in .*match.*undo_import/);
    expect(r.data_checks.duplicate_payouts).toHaveLength(1);
    expect(r.ytd).toBe(9900 + 1100); // flagged, not removed
  });
});

describe("countsVsPayouts", () => {
  const rates: RateLite[] = [{ payer: "Aetna", platform: "Grow Therapy", cpt_code: "90837", rate: 100, effective_from: "2026-01-01" }];
  const vol = (m: string, completed: number, cpt_code = "90837"): VolumeLite => ({
    month: `${m}-01`, payer: "Aetna", platform: "Grow Therapy", cpt_code, completed, no_shows: 0, late_cancels: 0, late_cancel_fee: 0,
  });

  it("flags settled months more than 25% off either way, and in-flight months only when payouts already exceed counts", () => {
    const income = new Map([["2026-07", 3100], ["2026-08", 5000], ["2026-09", 3000], ["2026-10", 4000], ["2026-11", 500]]);
    const volumes = [vol("2026-07", 30), vol("2026-08", 30), vol("2026-09", 50), vol("2026-10", 30), vol("2026-11", 30)];
    const checks = countsVsPayouts(rates, volumes, income, "2026-09", "2026-11-04");
    expect(checks.map((c) => [c.month, c.difference_pct, c.settled])).toEqual([
      ["August 2026", 67, true],
      ["September 2026", -40, true],
      ["October 2026", 33, false],
    ]);
  });

  it("skips months the rate card can't fully price", () => {
    const income = new Map([["2026-09", 9000]]);
    expect(countsVsPayouts(rates, [vol("2026-09", 30), vol("2026-09", 5, "90834")], income, "2026-09", "2026-11-04")).toEqual([]);
  });

  it("adds a data note in check_in without touching income", () => {
    const payouts = [...monthly(2025, allMonths, 1000), ...monthly(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1100)];
    const r = paced(computeCheckIn({ payouts, lagFor, goal: null, rates, volumes: [vol("2026-09", 5)], today: "2026-11-04" }));
    expect(r.data_notes.join(" ")).toMatch(/September 2026: logged counts \(5 sessions\).*\$500.*\$1,100 \(\+120%\)/);
    expect(r.ytd).toBe(9900);
  });
});
