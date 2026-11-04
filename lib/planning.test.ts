import { describe, expect, it } from "vitest";
import { goalNumbers, resolveGoalTarget } from "@/lib/planning";
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
