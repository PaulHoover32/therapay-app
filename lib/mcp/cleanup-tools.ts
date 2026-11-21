import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/database.types";
import { fail, text, therapistFor, type Ctx } from "@/lib/mcp/helpers";
import { getPlatforms } from "@/lib/payouts";
import { exactName, isJunkPayer, ownPayerNames, planRename, resolvePayer, scrubRaw, type RenameRow } from "@/lib/payers";
import { CPT_CODES } from "@/lib/planning";
import { getValidPayerNames } from "@/lib/therapists";

// Fixing payer mistakes: rename a payer everywhere, or remove rates and monthly counts. Every tool
// previews first and only writes with confirm=true. Writes are safe to re-run if one fails partway.

const MONTH = /^\d{4}-\d{2}(-\d{2})?$/;
const CHUNK = 200;
const DIRECT = "direct";

interface RateRow { id: string; payer: string; platform: string; cpt_code: string; rate: number; effective_from: string }
interface VolumeRow {
  id: string;
  month: string;
  payer: string;
  platform: string;
  cpt_code: string;
  completed: number;
  no_shows: number;
  late_cancels: number;
}

async function allRows<T>(supabase: SupabaseClient, table: string, columns: string, therapistId: string) {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("therapist_id", therapistId)
      .order("id")
      .range(start, start + 999)
      .returns<T[]>();
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

const loadRates = (supabase: SupabaseClient, therapistId: string) =>
  allRows<RateRow>(supabase, "payer_rates", "id, payer, platform, cpt_code, rate, effective_from", therapistId);
const loadVolumes = (supabase: SupabaseClient, therapistId: string) =>
  allRows<VolumeRow>(supabase, "monthly_volume", "id, month, payer, platform, cpt_code, completed, no_shows, late_cancels", therapistId);

function chunks<T>(items: T[], size = CHUNK) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

async function deleteByIds(supabase: SupabaseClient, table: string, therapistId: string, ids: string[]) {
  for (const part of chunks(ids)) {
    const { error } = await supabase.from(table).delete().eq("therapist_id", therapistId).in("id", part);
    if (error) throw new Error(error.message);
  }
}

async function applyRename(supabase: SupabaseClient, table: string, therapistId: string, updates: ReturnType<typeof planRename>["updates"]) {
  for (const u of updates) {
    for (const part of chunks(u.ids)) {
      const { error } = await supabase.from(table).update({ payer: u.payer, platform: u.platform }).eq("therapist_id", therapistId).in("id", part);
      if (error) throw new Error(error.message);
    }
  }
}

/** Moves payouts to the new name and removes the old name from their stored raw fields. */
async function renamePayouts(supabase: SupabaseClient, therapistId: string, rows: { id: string; raw: Json | null }[], from: string, to: string) {
  const scrubbed = rows.flatMap((r) => {
    const raw = scrubRaw(r.raw, from, to);
    return raw ? [{ id: r.id, raw }] : [];
  });
  for (const part of chunks(scrubbed, 20)) {
    const results = await Promise.all(
      part.map((r) => supabase.from("payouts").update({ payer: to, raw: r.raw }).eq("therapist_id", therapistId).eq("id", r.id))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
  const { error } = await supabase.from("payouts").update({ payer: to }).eq("therapist_id", therapistId).eq("payer", from);
  if (error) throw new Error(error.message);
}

const rateKey = (r: RateRow) => `${r.cpt_code}|${r.effective_from}`;
const volumeKey = (r: VolumeRow) => `${r.month}|${r.cpt_code}`;
const asRename = <T extends { id: string; payer: string; platform: string }>(rows: T[], key: (r: T) => string): RenameRow[] =>
  rows.map((r) => ({ id: r.id, payer: r.payer, platform: r.platform, key: key(r) }));

const describeRate = (r: RateRow) => ({
  payer: r.payer,
  platform: r.platform || null,
  cpt_code: r.cpt_code,
  rate: Number(r.rate),
  from: r.effective_from.slice(0, 7),
});

/** Per payer and month, what a set of monthly-count rows adds up to. */
function summarizeVolumes(rows: VolumeRow[]) {
  const groups = new Map<string, { month: string; payer: string; platform: string | null; completed: number; no_shows: number; late_cancels: number }>();
  for (const r of rows) {
    const key = `${r.month}|${r.payer}|${r.platform}`;
    const g = groups.get(key) ?? { month: r.month.slice(0, 7), payer: r.payer, platform: r.platform || null, completed: 0, no_shows: 0, late_cancels: 0 };
    g.completed += r.completed;
    g.no_shows += r.no_shows;
    g.late_cancels += r.late_cancels;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month) || a.payer.localeCompare(b.payer));
}

/** The name saved on this therapist's rows; "direct" means no platform. */
function savedName(input: string | undefined, names: string[], what: string) {
  if (!input) return { name: undefined };
  if (what === "platform" && input.trim().toLowerCase() === DIRECT) return { name: "" };
  const name = exactName(input, names);
  return name ? { name } : { error: `No ${what} named "${input}" is saved. Saved names: ${names.join(", ") || "none"}` };
}

export function registerCleanupTools(server: McpServer) {
  server.registerTool(
    "rename_payer",
    {
      title: "Rename or merge a payer",
      description:
        "Fix a payer or platform name everywhere it's saved: payouts, rate cards and monthly counts. Use it for a typo, or to merge a " +
        "name into an existing payer. Call first without confirm, show the user what would change, and call with confirm=true only " +
        "after they agree. If both names have a rate or count for the same code and month, it stops and lists the conflicts: ask " +
        "which to keep, remove the other with delete_rates or delete_month_counts, then rename. It also removes the old name from " +
        "stored payout details, so use it right away if a client's name was entered as a payer.",
      inputSchema: z.object({
        from: z.string().min(1).describe("The name as currently saved"),
        to: z.string().min(1).describe("The correct payer name; never a client's name"),
        confirm: z.boolean().default(false).describe("true applies the rename; false only previews it"),
      }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const [payers, platforms, own] = await Promise.all([getValidPayerNames(supabase), getPlatforms(supabase), ownPayerNames(supabase, therapist.id)]);
        const from = exactName(input.from, own);
        if (!from) return fail(`No payer named "${input.from}" is saved. Saved names: ${own.join(", ") || "none"}`);
        const others = [...new Set([...payers.filter((p) => !isJunkPayer(p)), ...platforms.map((p) => p.name), ...own])].filter((n) => n !== from);
        const target = resolvePayer(input.to, others);
        if ("error" in target) return fail(target.error);
        if (target.name === from) return fail(`"${from}" is already saved under that name.`);
        const to = target.name;

        const [rates, volumes, payoutRows] = await Promise.all([
          loadRates(supabase, therapist.id),
          loadVolumes(supabase, therapist.id),
          allRows<{ id: string; payer: string; amount: number; raw: Json | null }>(supabase, "payouts", "id, payer, amount, raw", therapist.id),
        ]);
        const payouts = payoutRows.filter((p) => p.payer === from);
        const ratePlan = planRename(asRename(rates, rateKey), from, to);
        const volumePlan = planRename(asRename(volumes, volumeKey), from, to);
        const changes = {
          payouts: payouts.length,
          payout_total: Math.round(payouts.reduce((t, p) => t + Number(p.amount), 0) * 100) / 100,
          rates: ratePlan.moved,
          monthly_count_rows: volumePlan.moved,
        };
        const conflicts = {
          rates: ratePlan.conflicts.map((k) => {
            const [cpt_code, from_date] = k.split("|");
            return { cpt_code, month: from_date.slice(0, 7) };
          }),
          monthly_counts: volumePlan.conflicts.map((k) => {
            const [month, cpt_code] = k.split("|");
            return { month: month.slice(0, 7), cpt_code: cpt_code || "no-shows / late cancels" };
          }),
        };
        const blocked = conflicts.rates.length + conflicts.monthly_counts.length > 0;
        const summary = { from, to, to_is_new_payer: target.isNew, similar_to: target.similar, changes };

        if (blocked) {
          return text({
            renamed: false,
            ...summary,
            conflicts,
            next_step: `"${from}" and "${to}" both have values for these. Ask which to keep, remove the other with delete_rates or delete_month_counts, then rename again.`,
          });
        }
        if (!input.confirm) {
          return text({ renamed: false, ...summary, next_step: "Show the user these changes and call again with confirm=true once they agree." });
        }
        try {
          await applyRename(supabase, "payer_rates", therapist.id, ratePlan.updates);
          await applyRename(supabase, "monthly_volume", therapist.id, volumePlan.updates);
          await renamePayouts(supabase, therapist.id, payouts, from, to);
        } catch (e) {
          return fail(`The rename stopped partway: ${(e as Error).message}. Run it again with the same names to finish.`);
        }
        return text({ renamed: true, ...summary });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "delete_rates",
    {
      title: "Delete rates",
      description:
        "Remove rates from a rate card: a whole payer, one platform, one CPT code or one effective month. To correct a rate, use " +
        "set_rate_card instead. Call first without confirm, show the user what would be removed, and call with confirm=true only " +
        "after they agree. This can't be undone.",
      inputSchema: z.object({
        payer: z.string().min(1).describe("Payer or platform name as saved"),
        platform: z.string().optional().describe(`Only rates through this platform; "${DIRECT}" for rates with no platform`),
        cpt_code: z.enum(CPT_CODES).optional().describe("Only this CPT code"),
        effective_month: z.string().regex(MONTH).optional().describe("Only the rate that started this month, YYYY-MM"),
        confirm: z.boolean().default(false).describe("true deletes; false only previews"),
      }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const rates = await loadRates(supabase, therapist.id);
        const names = [...new Set(rates.flatMap((r) => [r.payer, r.platform]).filter(Boolean))];
        const payer = savedName(input.payer, names, "payer with rates");
        if (payer.error) return fail(payer.error);
        const platform = savedName(input.platform, names, "platform");
        if (platform.error) return fail(platform.error);
        const month = input.effective_month?.slice(0, 7);
        const matched = rates.filter(
          (r) =>
            (r.payer === payer.name || r.platform === payer.name) &&
            (platform.name === undefined || r.platform === platform.name) &&
            (!input.cpt_code || r.cpt_code === input.cpt_code) &&
            (!month || r.effective_from.slice(0, 7) === month)
        );
        if (!matched.length) return text({ deleted: 0, message: "No rates match that." });
        const rows = matched.map(describeRate);
        if (!input.confirm) {
          return text({ deleted: 0, would_delete: rows.length, rates: rows, next_step: "Show the user these rates and call again with confirm=true once they agree." });
        }
        await deleteByIds(supabase, "payer_rates", therapist.id, matched.map((r) => r.id));
        return text({ deleted: rows.length, rates: rows });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "delete_month_counts",
    {
      title: "Delete monthly counts",
      description:
        "Remove saved monthly session counts, no-shows and late cancels, for one month, one payer, or both. To correct a month, use " +
        "log_month instead. Call first without confirm, show the user what would be removed, and call with confirm=true only after " +
        "they agree. This can't be undone. Payouts aren't affected.",
      inputSchema: z.object({
        month: z.string().regex(MONTH).optional().describe("Only this month, YYYY-MM"),
        payer: z.string().optional().describe("Only this payer or platform, as saved"),
        platform: z.string().optional().describe(`Only counts through this platform; "${DIRECT}" for counts with no platform`),
        confirm: z.boolean().default(false).describe("true deletes; false only previews"),
      }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        if (!input.month && !input.payer) return fail("Pass a month, a payer, or both.");
        const { supabase, therapist } = await therapistFor(ctx);
        const volumes = await loadVolumes(supabase, therapist.id);
        const names = [...new Set(volumes.flatMap((r) => [r.payer, r.platform]).filter(Boolean))];
        const payer = savedName(input.payer, names, "payer with counts");
        if (payer.error) return fail(payer.error);
        const platform = savedName(input.platform, names, "platform");
        if (platform.error) return fail(platform.error);
        const month = input.month?.slice(0, 7);
        const matched = volumes.filter(
          (r) =>
            (!month || r.month.slice(0, 7) === month) &&
            (payer.name === undefined || r.payer === payer.name || r.platform === payer.name) &&
            (platform.name === undefined || r.platform === platform.name)
        );
        if (!matched.length) return text({ deleted: 0, message: "No monthly counts match that." });
        const months = summarizeVolumes(matched);
        if (!input.confirm) {
          return text({ deleted: 0, would_delete: months, next_step: "Show the user these counts and call again with confirm=true once they agree." });
        }
        await deleteByIds(supabase, "monthly_volume", therapist.id, matched.map((r) => r.id));
        return text({ deleted: matched.length, removed: months });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );
}
