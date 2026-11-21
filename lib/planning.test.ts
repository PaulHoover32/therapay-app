import { describe, expect, it } from "vitest";
import { goalNumbers, rateCards, resolveGoalTarget } from "@/lib/planning";
import { resolvePayer } from "@/lib/payers";
import { splitDuplicates } from "@/lib/imports";

describe("resolveGoalTarget", () => {
  const complete = { total: 100000, complete: true };
  it("needs exactly one of a dollar target or a growth %", () => {
    expect(resolveGoalTarget({}, complete)).toHaveProperty("error");
    expect(resolveGoalTarget({ target_income: 1, growth_pct_over_last_year: 5 }, complete)).toHaveProperty("error");
  });
  it("computes growth over a complete last year and refuses a partial one", () => {
    expect(resolveGoalTarget({ growth_pct_over_last_year: 7 }, complete)).toEqual({ target: 107000 });
    expect(resolveGoalTarget({ growth_pct_over_last_year: 7 }, { total: 50000, complete: false })).toHaveProperty("error");
    expect(resolveGoalTarget({ target_income: 120000 }, { total: 0, complete: false })).toEqual({ target: 120000 });
  });
});

describe("goalNumbers", () => {
  it("derives hours and per-session payout from the blended rate", () => {
    expect(goalNumbers(96000, 125, 53, null)).toEqual({ annual_income_target: 96000, target_avg_payout: 125, target_weekly_hours: 14.1 });
  });
  it("carries over the previous goal's values, else stores 0", () => {
    expect(goalNumbers(96000, null, 53, { target_avg_payout: 110, target_weekly_hours: 20 })).toMatchObject({ target_avg_payout: 110, target_weekly_hours: 20 });
    expect(goalNumbers(96000, null, 53, null)).toMatchObject({ target_avg_payout: 0, target_weekly_hours: 0 });
  });
});

describe("splitDuplicates", () => {
  const rows = [
    { row: 1, id: "po_A" },
    { row: 2, id: "po_B" },
    { row: 3, id: "po_A" },
    { row: 4, id: null },
    { row: 5, id: null },
    { row: 6, id: "bank-123" },
  ];
  it("skips Stripe IDs already saved or repeated in the file, and keeps everything else", () => {
    const { keep, skipped } = splitDuplicates(rows, (r) => r.id, new Set(["po_B"]));
    expect(keep.map((r) => r.row)).toEqual([1, 4, 5, 6]);
    expect(skipped.map((s) => [s.row.row, s.reason])).toEqual([
      [2, "already_imported"],
      [3, "repeated_in_file"],
    ]);
  });
});

describe("rateCards", () => {
  const rate = (payer: string, cpt_code: string, value: number, effective_from: string, platform = "") => ({ payer, platform, cpt_code, rate: value, effective_from });

  it("groups by payer and platform with current, previous and upcoming rates", () => {
    const cards = rateCards(
      [rate("Aetna", "90837", 120, "2026-01-01"), rate("Aetna", "90837", 130, "2026-06-01"), rate("Aetna", "90837", 140, "2027-01-01"), rate("Aetna", "90834", 95, "2026-01-01", "Headway")],
      "2026-11"
    );
    expect(cards.map((c) => c.platform)).toEqual([null, "Headway"]);
    expect(cards[0].rates[0]).toMatchObject({ rate: 130, since: "2026-06", previous: [{ rate: 120, from: "2026-01" }], upcoming: [{ rate: 140, from: "2027-01" }] });
  });
  it("shows a rate that hasn't started yet as upcoming, with no current rate", () => {
    const [card] = rateCards([rate("Cigna", "90837", 110, "2027-02-01")], "2026-11");
    expect(card.rates[0]).toMatchObject({ rate: null, since: null, upcoming: [{ rate: 110, from: "2027-02" }] });
  });
});

describe("resolvePayer", () => {
  const names = ["Aetna", "Grow Therapy", "United Healthcare", "Cigna / Evernorth"];

  it("matches known names, including a one-word short form", () => {
    expect(resolvePayer("aetna", names)).toEqual({ name: "Aetna", isNew: false, similar: [] });
    expect(resolvePayer("Grow", names)).toMatchObject({ name: "Grow Therapy", isNew: false });
  });
  it("adds a new payer instead of folding it into one that starts the same", () => {
    expect(resolvePayer("United Behavioral", names)).toEqual({ name: "United Behavioral", isNew: true, similar: ["United Healthcare"] });
    expect(resolvePayer("  Kaiser   Permanente ", names)).toEqual({ name: "Kaiser Permanente", isNew: true, similar: [] });
  });
  it("flags a likely typo", () => {
    expect(resolvePayer("Aetnaa", names)).toMatchObject({ isNew: true, similar: ["Aetna"] });
  });
  it("rejects empty, overlong, symbol-only and placeholder names", () => {
    for (const bad of ["", "   ", "x".repeat(61), "12345", "<script>", "Payer_12"]) {
      expect(resolvePayer(bad, names)).toHaveProperty("error");
    }
  });
});
