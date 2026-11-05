import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, isJunkPayer, resolveName, text, therapistFor, type Ctx } from "@/lib/mcp/helpers";
import { getPlatforms } from "@/lib/payouts";
import { getValidPayerNames } from "@/lib/therapists";
import {
  CPT_CODES,
  CPT_LABELS,
  firstOfMonth,
  getActiveGoal,
  getRates,
  getVolumes,
  goalNumbers,
  resolveGoalTarget,
  setActiveGoal,
  upsertMonth,
  upsertRates,
  type RateInput,
  type VolumeInput,
} from "@/lib/planning";
import { blendedRate, computeCheckIn, getLagLookup, loadPayoutsForPacing, monthlyIncome } from "@/lib/pacing";

// Rate card, monthly counts, goal and the "am I on track?" check-in. Income is payouts only; the
// rate card and counts are for payer-mix levers. Nothing here accepts dates of individual
// sessions, client details or free text.

const MONTH = /^\d{4}-\d{2}(-\d{2})?$/;
const cptHelp = CPT_CODES.map((c) => `${c} ${CPT_LABELS[c]}`).join(", ");
const today = () => new Date().toISOString().slice(0, 10);

async function nameLists(supabase: SupabaseClient) {
  const [payers, platforms] = await Promise.all([getValidPayerNames(supabase), getPlatforms(supabase)]);
  return { payers: payers.filter((p) => !isJunkPayer(p)), platforms: platforms.map((p) => p.name) };
}

/** Payer must be a known insurer/cash option or platform; platform (optional) must be a known platform. */
function resolveEntity(input: { payer: string; platform?: string }, lists: { payers: string[]; platforms: string[] }) {
  const payer = resolveName(input.payer, [...lists.payers, ...lists.platforms]);
  if (!payer) return { error: `Unknown payer "${input.payer}". Use one of: ${[...lists.payers, ...lists.platforms].join(", ")}` };
  if (!input.platform) return { payer, platform: "" };
  const platform = resolveName(input.platform, lists.platforms);
  if (!platform) return { error: `Unknown platform "${input.platform}". Use one of: ${lists.platforms.join(", ")}` };
  return { payer, platform: platform === payer ? "" : platform };
}

const rateRow = z.object({
  payer: z.string().describe("Insurer or payment source, e.g. Aetna, Cigna / Evernorth, Cash"),
  platform: z.string().optional().describe("Platform the sessions go through, if any (Grow Therapy, Headway, Alma…); omit for direct"),
  cpt_code: z.enum(CPT_CODES).describe(`CPT code: ${cptHelp}`),
  rate: z.number().positive().max(2000).describe("What this payer pays per session for this code, in dollars"),
});

const monthPayer = z.object({
  payer: z.string().describe("Insurer or payment source"),
  platform: z.string().optional().describe("Platform the sessions went through, if any"),
  sessions: z
    .array(z.object({ cpt_code: z.enum(CPT_CODES), completed: z.number().int().min(0).max(500) }))
    .max(5)
    .default([])
    .describe("Completed session counts per CPT code for this payer this month"),
  no_shows: z.number().int().min(0).max(500).default(0).describe("No-shows this month for this payer"),
  late_cancels: z.number().int().min(0).max(500).default(0).describe("Late cancels this month for this payer"),
  late_cancel_fee: z.number().min(0).max(2000).default(0).describe("Fee collected per late cancel, if any (0 if none)"),
});

export function registerPlanningTools(server: McpServer) {
  server.registerTool(
    "set_rate_card",
    {
      title: "Set rate card",
      description:
        "Save what each payer pays the provider per session, by CPT code (her rate card). Ask 'what does each payer pay you per session, " +
        "and for which codes?' Approximate numbers are fine. Include the platform (Grow Therapy, Headway, Alma…) when sessions go " +
        "through one, because rates differ by platform. A changed rate gets a new effective month; history is kept. The rate card is " +
        "used only for payer-mix levers (sessions needed, what-if swaps, no-show cost); it never counts as income.",
      inputSchema: z.object({
        rates: z.array(rateRow).min(1).max(60),
        effective_month: z.string().regex(MONTH).optional().describe("Month these rates start, YYYY-MM (default: this month)"),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const lists = await nameLists(supabase);
        const effective_from = firstOfMonth(input.effective_month ? `${input.effective_month.slice(0, 7)}-01` : today());
        const rows: RateInput[] = [];
        for (const r of input.rates) {
          const e = resolveEntity(r, lists);
          if ("error" in e) return fail(e.error!);
          rows.push({ payer: e.payer, platform: e.platform, cpt_code: r.cpt_code, rate: Math.round(r.rate * 100) / 100, effective_from });
        }
        const { data, error } = await upsertRates(supabase, therapist.id, rows);
        if (error) return fail(`Could not save the rate card: ${error.message}`);
        return text({ saved: data?.length ?? 0, effective_from, rates: data });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "log_month",
    {
      title: "Log a month's counts",
      description:
        "Record one month's session counts per payer and CPT code, plus no-shows and late cancels. Ask it as a quick monthly " +
        "check-in: counts only. NEVER ask for or send session dates, client names, initials or any client detail. Entering the same " +
        "month again replaces that month's numbers. Counts power payer-mix levers only; income always comes from payouts.",
      inputSchema: z.object({
        month: z.string().regex(MONTH).describe("Month the counts are for, YYYY-MM"),
        payers: z.array(monthPayer).min(1).max(20),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const month = `${input.month.slice(0, 7)}-01`;
        if (month > firstOfMonth(today())) return fail("That month is in the future.");
        const lists = await nameLists(supabase);
        const rows: VolumeInput[] = [];
        for (const p of input.payers) {
          const e = resolveEntity(p, lists);
          if ("error" in e) return fail(e.error!);
          const base = { payer: e.payer, platform: e.platform, no_shows: 0, late_cancels: 0, late_cancel_fee: 0 };
          for (const s of p.sessions) rows.push({ ...base, cpt_code: s.cpt_code, completed: s.completed });
          // No-shows and late cancels aren't code-specific: they live on the payer's cpt_code '' row
          rows.push({ ...base, cpt_code: "", completed: 0, no_shows: p.no_shows, late_cancels: p.late_cancels, late_cancel_fee: p.late_cancel_fee });
        }
        const { data, error } = await upsertMonth(supabase, therapist.id, month, rows);
        if (error) return fail(`Could not save ${input.month}: ${error.message}`);
        const completed = rows.reduce((t, r) => t + r.completed, 0);
        return text({ saved: true, month: input.month.slice(0, 7), completed_sessions: completed, rows: data?.length ?? 0 });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "set_goal",
    {
      title: "Set income goal",
      description:
        "Set this year's income goal, measured on cash received (payouts): either a dollar target or a growth % over last year. " +
        "Before calling, state the exact target to the user and ask them to confirm. It replaces the current goal for this year.",
      inputSchema: z.object({
        target_income: z.number().positive().max(2_000_000).optional().describe("Annual income target in dollars"),
        growth_pct_over_last_year: z.number().min(-50).max(200).optional().describe("Growth over last year's payouts, e.g. 7 for +7%"),
      }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, userId, therapist } = await therapistFor(ctx);
        const now = today();
        const year = Number(now.slice(0, 4));
        const [payouts, lagFor] = await Promise.all([loadPayoutsForPacing(supabase, therapist.id, now), getLagLookup(supabase)]);
        const income = monthlyIncome(payouts, lagFor);
        const lyMonths = Array.from({ length: 12 }, (_, i) => `${year - 1}-${String(i + 1).padStart(2, "0")}`);
        const lastYear = { total: lyMonths.reduce((t, m) => t + (income.get(m) ?? 0), 0), complete: lyMonths.every((m) => (income.get(m) ?? 0) > 0) };
        const resolved = resolveGoalTarget(input, lastYear);
        if ("error" in resolved) return fail(resolved.error);

        const [{ data: rates }, { data: volumes }, { data: previous }] = await Promise.all([
          getRates(supabase, therapist.id),
          getVolumes(supabase, therapist.id, `${year - 1}-01-01`),
          getActiveGoal(supabase, userId, year),
        ]);
        const ym = now.slice(0, 7);
        const recent = [1, 2, 3].map((i) => {
          const d = new Date(`${ym}-01T00:00:00Z`);
          d.setUTCMonth(d.getUTCMonth() - i);
          return d.toISOString().slice(0, 7);
        });
        const blend = blendedRate(rates ?? [], volumes ?? [], recent, ym);
        const numbers = goalNumbers(resolved.target, blend?.rate ?? null, therapist.avg_session_duration, previous);
        const { changed, error } = await setActiveGoal(supabase, userId, year, numbers);
        if (error) return fail(`Could not save the goal: ${error.message}`);
        return text({ saved: true, changed, goal_year: year, annual_income_target: numbers.annual_income_target, measured_on: "payouts (cash received)" });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "check_in",
    {
      title: "Am I on track?",
      description:
        "Answer 'how am I doing / am I on track / will I beat last year?'. Uses payouts only (cash received): year-to-date vs the same " +
        "months last year, pace, projected year-end vs her goal (or last year's total when no goal is set), the gap, money still " +
        "arriving, the next expected payouts, and levers to close the gap (dollars per month, payer-mix what-ifs, no-show cost, weeks " +
        "off she can afford). Sessions come as current vs needed (levers.sessions): needed_per_month is her TOTAL monthly volume, " +
        "never extra on top, so always present it next to current_per_month and the gap (use levers.sessions.summary). Recent months " +
        "whose money hasn't had time to arrive are reported separately, never counted as behind. data_checks flags likely duplicate " +
        "payouts and months where counts × rate card disagree with payouts: lead with these, since they distort every figure, and " +
        "ask the user before undoing anything. If any figure still looks implausible, say so and name the likely cause instead of " +
        "advising on it. Pass on what data_notes suggest (import last year's payouts, set_goal, set_rate_card). Explain in plain " +
        "language; don't dump the JSON.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async (_input, ctx: Ctx) => {
      try {
        const { supabase, userId, therapist } = await therapistFor(ctx);
        const now = today();
        const year = Number(now.slice(0, 4));
        const [payouts, lagFor, { data: rates }, { data: volumes }, { data: goal }] = await Promise.all([
          loadPayoutsForPacing(supabase, therapist.id, now),
          getLagLookup(supabase),
          getRates(supabase, therapist.id),
          getVolumes(supabase, therapist.id, `${year - 1}-01-01`),
          getActiveGoal(supabase, userId, year),
        ]);
        if (!payouts.length) {
          return text({ data_notes: ["No payouts yet. Ask the user for their payout history (Stripe Express export, platform statement or bank statement) and use import_payouts."] });
        }
        return text(
          computeCheckIn({
            payouts,
            lagFor,
            goal: goal ? Number(goal.annual_income_target) : null,
            rates: rates ?? [],
            volumes: volumes ?? [],
            today: now,
          })
        );
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );
}
