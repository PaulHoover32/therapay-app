import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/database.types";
import { DATE, dayAfter, fail, text, therapistFor, type Ctx } from "@/lib/mcp/helpers";
import { insertSessions, SESSION_CODES, type SessionCode, type SessionFields } from "@/lib/sessions";
import { getPlatforms, insertPayouts, listPayouts, PAYOUT_STATUSES, type PayoutFields, type PayoutStatus } from "@/lib/payouts";
import { getValidPayerNames, US_STATES } from "@/lib/therapists";
import {
  batchContents,
  createBatch,
  deleteBatch,
  extendBatch,
  findOverlaps,
  formatRange,
  getBatch,
  listBatches,
  type BatchRow,
  type Grain,
} from "@/lib/imports";
import { getLagLookup, loadReconciliation, workDate } from "@/lib/reconciliation";

// Bulk import of history the provider pastes, uploads or screenshots into Claude/ChatGPT.
// The model extracts structured rows; the server never parses files. Every import is a dry run
// first, rows are validated one by one (a bad row never fails the call), duplicates are never
// dropped, and overlap with existing data comes back as a warning for the user to decide on.

const MAX_ROWS = 500;
const LIST_LIMIT = 500;
const PREVIEW_ROWS = 24;

const round = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isJunkPayer = (name: string) => /^Payer_\d+$/.test(name);

// ---------- field parsing ----------

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else if (us) [m, d, y] = [+us[1], +us[2], us[3].length === 2 ? 2000 + +us[3] : +us[3]];
  else {
    const t = Date.parse(s);
    if (Number.isNaN(t)) return null;
    const dt = new Date(t);
    [y, m, d] = [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (y < 2000 || y > new Date().getFullYear() + 1) return null;
  return dt.toISOString().slice(0, 10);
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let s = value.trim().replace(/[$,\s]|USD/gi, "");
  let sign = 1;
  if (/^\(.*\)$/.test(s)) [s, sign] = [s.slice(1, -1), -1];
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return sign * Number(s);
}

/** Exact (case-insensitive) match, else a unique match on the first word ("Grow" → "Grow Therapy"). */
function resolveName(input: string | undefined, names: string[]) {
  if (!input?.trim()) return null;
  const n = norm(input);
  const exact = names.find((name) => norm(name) === n);
  if (exact) return exact;
  const first = n.split(" ")[0];
  const byWord = names.filter((name) => norm(name).split(" ")[0] === first);
  return byWord.length === 1 ? byWord[0] : null;
}

const STRIPE_STATUS: Record<string, PayoutStatus> = {
  paid: "paid",
  deposited: "paid",
  complete: "paid",
  completed: "paid",
  pending: "pending",
  in_transit: "pending",
  "in transit": "pending",
  scheduled: "pending",
  failed: "failed",
  canceled: "failed",
  cancelled: "failed",
  reversed: "reversed",
  refunded: "reversed",
};

// raw is kept for auditing, but it is free-form, so only values that can't carry a name survive:
// numbers, booleans, dates, money, IDs like po_123, currency codes, status words, payer names.
const SAFE_WORDS = new Set([
  ...Object.keys(STRIPE_STATUS),
  "usd", "standard", "instant", "bank_account", "card", "automatic", "manual", "payout", "deposit", "transfer", "credit", "debit",
]);

function sanitizeRaw(raw: Record<string, unknown> | undefined, knownNames: Set<string>) {
  if (!raw) return { raw: null, dropped: [] as string[] };
  const kept: Record<string, Json> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(raw).slice(0, 40)) {
    if (!/^[\w .\-()/#]{1,40}$/.test(key)) {
      dropped.push(key.slice(0, 40));
      continue;
    }
    if (value === null || typeof value === "number" || typeof value === "boolean") {
      kept[key] = value;
      continue;
    }
    const s = typeof value === "string" ? value.trim() : "";
    const safe =
      /^\(?-?\$?[\d,]+(\.\d+)?\)?$/.test(s) ||
      /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(s) ||
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) ||
      /^[a-z]{2,6}_[A-Za-z0-9]{6,}$/.test(s) ||
      /^[A-Z]{3}$/.test(s) ||
      SAFE_WORDS.has(s.toLowerCase()) ||
      knownNames.has(s.toLowerCase());
    if (safe) kept[key] = s;
    else dropped.push(key);
  }
  return { raw: Object.keys(kept).length ? kept : null, dropped };
}

const CPT_KEYS = ["session_code", "cpt", "cpt_code", "code", "service_code", "procedure_code"];
const PAYOUT_KEYS = ["external_id", "payout_id", "arrival_date", "payout_date", "period_start", "period_end"];

function hasCpt(row: Record<string, unknown>) {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  return CPT_KEYS.some((k) => /^\d{5}$/.test(String(row[k] ?? raw[k] ?? "").trim()));
}

function looksLikePayout(row: Record<string, unknown>) {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  const ids = [row.external_id, row.payout_id, raw.id, raw.payout_id].map((v) => String(v ?? ""));
  return ids.some((v) => v.startsWith("po_")) || PAYOUT_KEYS.some((k) => k !== "external_id" && row[k] != null);
}

// ---------- input schemas ----------

// Rows are deliberately loose so one malformed row is reported, not rejected with the whole call.
const loose = z.union([z.string(), z.number()]).optional();

const payoutRow = z.looseObject({
  payer: z.string().optional().describe("Platform or payer that sent the money, e.g. Grow Therapy, Headway, Alma, Aetna"),
  payout_date: z.string().optional().describe("Date the deposit was paid / arrives (Stripe: arrival date), YYYY-MM-DD"),
  amount: loose.describe("Net amount received in dollars"),
  currency: z.string().optional().describe("ISO currency, default USD"),
  external_id: z.string().optional().describe("Payout ID from the source, e.g. Stripe po_..."),
  status: z.string().optional().describe("paid, pending (in_transit), failed (canceled) or reversed; default paid"),
  period_start: z.string().optional().describe("First day of work this payout covers, if stated"),
  period_end: z.string().optional().describe("Last day of work this payout covers, if stated"),
  raw: z.record(z.string(), z.unknown()).optional().describe("The original row's fields for auditing (no names)"),
});

const sessionRow = z.looseObject({
  session_date: z.string().optional().describe("Date of the session, YYYY-MM-DD"),
  amount: loose.describe("Dollars earned for this session"),
  session_code: loose.describe("CPT code: 90837, 90834, 90847, 90853 or 90791"),
  payer: z.string().optional().describe("Insurance company or payment source (Therapay payer name, e.g. Aetna, Cash)"),
  state: z.string().optional().describe("2-letter US state"),
  platform: z.string().optional().describe("Platform the session was held through, if any (Grow Therapy, Headway, Alma…)"),
});

const importCommon = {
  dry_run: z.boolean().default(true).describe("true (default) previews and writes nothing; false saves the rows"),
  batch_id: z.string().uuid().optional().describe("batch_id returned by the first saved chunk; pass it on every later chunk of the same import"),
  filename: z.string().max(200).optional().describe("Original file name, if the data came from a file"),
};

const importPayoutsInput = z.object({
  payouts: z.array(payoutRow).min(1).max(MAX_ROWS).describe(`Up to ${MAX_ROWS} payouts per call; split larger imports into chunks`),
  ...importCommon,
});

const bulkSessionsInput = z.object({
  sessions: z.array(sessionRow).min(1).max(MAX_ROWS).describe(`Up to ${MAX_ROWS} sessions per call; split larger imports into chunks`),
  ...importCommon,
});

// ---------- shared import flow ----------

type RowError = { row: number; errors: string[] };

interface Prepared<T> {
  grain: Grain;
  valid: { row: number; fields: T; payer: string; date: string; amount: number }[];
  invalid: RowError[];
  rowWarnings: { row: number; warning: string }[];
  detected: string;
  preview: { start: string; end: string; extraSessions?: SessionFields[]; extraPayouts?: PayoutFields[] };
  keys: string[];
}

async function runImport<T>(
  supabase: SupabaseClient,
  therapistId: string,
  input: { dry_run: boolean; batch_id?: string; filename?: string },
  received: number,
  prepared: Prepared<T>,
  insert: (rows: T[], batchId: string) => PromiseLike<{ error: { message: string } | null; count: number }>
) {
  const { grain, valid, invalid } = prepared;
  const noun = grain === "session" ? "sessions" : "payouts";

  let batch: BatchRow | null = null;
  if (input.batch_id) {
    const { data, error } = await getBatch(supabase, therapistId, input.batch_id);
    if (error) return fail(`Could not load batch: ${error.message}`);
    if (!data) return fail(`No import batch ${input.batch_id} found. Omit batch_id to start a new import.`);
    if (data.grain !== grain) return fail(`Batch ${input.batch_id} holds ${data.grain}s, not ${noun}. Start a new import for these rows.`);
    batch = data;
  }

  const overlaps = await findOverlaps(
    supabase,
    therapistId,
    grain,
    valid.map((v) => ({ payer: v.payer, date: v.date, amount: v.amount })),
    batch?.id
  );

  let inserted = 0;
  if (!input.dry_run && valid.length) {
    if (!batch) {
      const { data, error } = await createBatch(supabase, therapistId, grain, input.filename);
      if (error || !data) return fail(`Could not start the import: ${error?.message ?? "no batch returned"}`);
      batch = data;
    }
    const { error, count } = await insert(
      valid.map((v) => v.fields),
      batch.id
    );
    if (error) return fail(`Could not save the ${noun}: ${error.message}. Nothing from this chunk was saved.`);
    inserted = count;
    const { data } = await extendBatch(supabase, batch, received, inserted);
    if (data) batch = data;
  }

  const dates = valid.map((v) => v.date).sort();
  const total = round(valid.reduce((t, v) => t + v.amount, 0));
  const byPayer = Object.values(
    valid.reduce<Record<string, { payer: string; count: number; total: number }>>((acc, v) => {
      const g = (acc[v.payer] ??= { payer: v.payer, count: 0, total: 0 });
      g.count += 1;
      g.total = round(g.total + v.amount);
      return acc;
    }, {})
  );

  let reconciliation_preview: unknown = null;
  if (valid.length) {
    const recon = await loadReconciliation(supabase, therapistId, {
      start: prepared.preview.start,
      end: prepared.preview.end,
      payers: prepared.keys,
      extra: input.dry_run
        ? {
            sessions: prepared.preview.extraSessions?.map((s) => ({ ...s, platform: s.platform ?? null })),
            payouts: prepared.preview.extraPayouts?.map((p) => ({
              payout_date: p.payout_date,
              amount: p.amount,
              payer: p.payer,
              status: p.status ?? "paid",
              period_start: p.period_start ?? null,
              period_end: p.period_end ?? null,
            })),
          }
        : undefined,
    });
    reconciliation_preview = {
      note: input.dry_run ? "As it would look after this import" : "After this import",
      totals: recon.totals,
      rows: recon.rows.slice(-PREVIEW_ROWS).map((r) => ({ payer: r.payer, period: r.period_label, expected: r.expected, received: r.received, difference: r.difference, status: r.status })),
    };
  }

  const next_step = input.dry_run
    ? valid.length
      ? `Show the user this summary${overlaps.length ? ", including the overlap warning" : ""} and ask them to confirm. ` +
        `Then call again with the same rows and dry_run=false${batch ? ` and batch_id=${batch.id}` : ""}.`
      : `Nothing to import: every row was invalid. Fix the rows listed under invalid_rows and try again.`
    : `Saved ${inserted} ${noun} to batch ${batch?.id}. For more chunks of this import, pass batch_id=${batch?.id}. ` +
      `To reverse the whole import, call undo_import with this batch_id.`;

  return text({
    dry_run: input.dry_run,
    grain,
    detected: prepared.detected,
    batch_id: batch?.id ?? null,
    batch: batch && { row_count: batch.row_count, inserted_count: batch.inserted_count, created_at: batch.created_at },
    received_rows: received,
    [input.dry_run ? "would_insert" : "inserted"]: input.dry_run ? valid.length : inserted,
    invalid_count: invalid.length,
    invalid_rows: invalid,
    overlap_warnings: overlaps,
    row_warnings: prepared.rowWarnings,
    date_range: dates.length ? { from: dates[0], to: dates[dates.length - 1], label: formatRange(dates[0], dates[dates.length - 1]) } : null,
    total_amount: total,
    by_payer: byPayer,
    reconciliation_preview,
    next_step,
  });
}

async function prepareSessions(supabase: SupabaseClient, rows: z.infer<typeof sessionRow>[]): Promise<Prepared<SessionFields>> {
  const [payers, platforms] = await Promise.all([getValidPayerNames(supabase), getPlatforms(supabase)]);
  const payerNames = payers.filter((p) => !isJunkPayer(p));
  const platformNames = platforms.map((p) => p.name);
  const valid: Prepared<SessionFields>["valid"] = [];
  const invalid: RowError[] = [];
  const rowWarnings: Prepared<SessionFields>["rowWarnings"] = [];

  rows.forEach((r, i) => {
    const row = i + 1;
    const errors: string[] = [];
    if (looksLikePayout(r)) errors.push("Looks like a payout (payout ID or arrival date), not a session. Use import_payouts for payouts.");
    const date = parseDate(r.session_date);
    if (!date) errors.push(`session_date "${r.session_date ?? ""}" is not a valid date`);
    const amount = parseAmount(r.amount);
    if (amount === null || amount <= 0 || amount > 10000) errors.push(`amount "${r.amount ?? ""}" must be a positive number up to 10,000`);
    const code = String(r.session_code ?? "").trim();
    if (!(SESSION_CODES as readonly string[]).includes(code)) errors.push(`session_code "${code}" must be one of ${SESSION_CODES.join(", ")}`);
    const payer = resolveName(r.payer, payerNames);
    if (!payer) errors.push(`payer "${r.payer ?? ""}" is not a Therapay payer (${payerNames.join(", ")})`);
    const state = String(r.state ?? "").trim().toUpperCase();
    if (!(US_STATES as readonly string[]).includes(state)) errors.push(`state "${r.state ?? ""}" must be a 2-letter US code`);
    const platform = r.platform ? resolveName(r.platform, platformNames) : null;
    if (r.platform && !platform) errors.push(`platform "${r.platform}" is not one of ${platformNames.join(", ")}`);

    if (errors.length) return invalid.push({ row, errors });
    if (amount! > 1000) rowWarnings.push({ row, warning: `${usd(amount!)} is unusually large for one session. Is this a payout?` });
    valid.push({
      row,
      payer: payer!,
      date: date!,
      amount: amount!,
      fields: { session_datetime: date!, amount: amount!, session_code: code as SessionCode, payer: payer!, state, platform, source: "bulk_import" },
    });
  });

  const dates = valid.map((v) => v.date).sort();
  const n = valid.length;
  return {
    grain: "session",
    valid,
    invalid,
    rowWarnings,
    detected: n
      ? `These look like ${n} session${n === 1 ? "" : "s"} (one row per appointment with a CPT code) from ${formatRange(dates[0], dates[n - 1])}.`
      : "No valid session rows.",
    preview: { start: dates[0] ?? "", end: dates[n - 1] ?? "", extraSessions: valid.map((v) => v.fields) },
    keys: [...new Set(valid.map((v) => v.fields.platform ?? v.payer))],
  };
}

async function preparePayouts(supabase: SupabaseClient, rows: z.infer<typeof payoutRow>[]): Promise<Prepared<PayoutFields>> {
  const [payers, platforms, lagFor] = await Promise.all([getValidPayerNames(supabase), getPlatforms(supabase), getLagLookup(supabase)]);
  const names = [...platforms.map((p) => p.name), ...payers.filter((p) => !isJunkPayer(p))];
  const known = new Set(names.map((n) => n.toLowerCase()));
  const valid: Prepared<PayoutFields>["valid"] = [];
  const invalid: RowError[] = [];
  const rowWarnings: Prepared<PayoutFields>["rowWarnings"] = [];

  rows.forEach((r, i) => {
    const row = i + 1;
    const errors: string[] = [];
    if (hasCpt(r)) errors.push("Has a CPT code, so it looks like a session, not a payout. Use bulk_log_sessions for sessions.");
    const payer = resolveName(r.payer, names);
    if (!payer) errors.push(`payer "${r.payer ?? ""}" is not a known platform or payer (${names.join(", ")})`);
    const date = parseDate(r.payout_date);
    if (!date) errors.push(`payout_date "${r.payout_date ?? ""}" is not a valid date`);
    const amount = parseAmount(r.amount);
    if (amount === null || amount === 0 || Math.abs(amount) > 100000) errors.push(`amount "${r.amount ?? ""}" must be a non-zero number`);
    const statusIn = (r.status ?? "paid").trim().toLowerCase();
    const status = STRIPE_STATUS[statusIn] ?? ((PAYOUT_STATUSES as readonly string[]).includes(statusIn) ? (statusIn as PayoutStatus) : null);
    if (!status) errors.push(`status "${r.status}" must be paid, pending, failed or reversed`);
    const currency = (r.currency ?? "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) errors.push(`currency "${r.currency}" must be a 3-letter code like USD`);
    const external_id = r.external_id?.trim() || null;
    if (external_id && !/^[A-Za-z0-9_\-.]{1,100}$/.test(external_id)) errors.push(`external_id "${external_id}" may only contain letters, digits, _ - .`);
    const period_start = r.period_start ? parseDate(r.period_start) : null;
    const period_end = r.period_end ? parseDate(r.period_end) : null;
    if (r.period_start && !period_start) errors.push(`period_start "${r.period_start}" is not a valid date`);
    if (r.period_end && !period_end) errors.push(`period_end "${r.period_end}" is not a valid date`);
    if (period_start && period_end && period_end < period_start) errors.push("period_end is before period_start");

    if (errors.length) return invalid.push({ row, errors });
    const { raw, dropped } = sanitizeRaw(r.raw, known);
    if (dropped.length) rowWarnings.push({ row, warning: `Not stored from raw (could contain names): ${dropped.join(", ")}` });
    if (currency !== "USD") rowWarnings.push({ row, warning: `Currency ${currency}: totals and reconciliation treat amounts as USD.` });
    valid.push({
      row,
      payer: payer!,
      date: date!,
      amount: amount!,
      fields: { payer: payer!, payout_date: date!, amount: amount!, currency, external_id, status: status!, period_start, period_end, source: "bulk_import", raw },
    });
  });

  const dates = valid.map((v) => v.date).sort();
  const n = valid.length;
  const stripe = valid.some((v) => v.fields.external_id?.startsWith("po_"));
  const payerList = [...new Set(valid.map((v) => v.payer))];
  // Preview from the earliest period these payouts could cover through the last payout
  const workDates = valid.map((v) => workDate({ ...v.fields, status: v.fields.status ?? "paid", period_start: v.fields.period_start ?? null, period_end: v.fields.period_end ?? null }, lagFor(v.payer))).sort();
  return {
    grain: "payout",
    valid,
    invalid,
    rowWarnings,
    detected: n
      ? `These look like ${n} ${stripe ? "Stripe " : ""}payout${n === 1 ? "" : "s"} from ${payerList.join(", ")} (lump-sum deposits, ${formatRange(dates[0], dates[n - 1])}).`
      : "No valid payout rows.",
    preview: { start: workDates[0] ?? "", end: dates[n - 1] ?? "", extraPayouts: valid.map((v) => v.fields) },
    keys: payerList,
  };
}

// ---------- tools ----------

export function registerImportTools(server: McpServer) {
  server.registerTool(
    "import_payouts",
    {
      title: "Import payouts",
      description:
        "Bulk-import payout history: lump-sum deposits the provider RECEIVED from a platform or payer (Grow Therapy via Stripe Express, " +
        "Headway, Alma, an insurer…). The user may give you a CSV, a spreadsheet, pasted dashboard or statement text, or a screenshot: " +
        "extract each payout yourself and map it to these fields. A Stripe Express payout export usually has the payout ID (po_...), " +
        "amount, arrival date (use it as payout_date) and status. Payout signals: payout IDs, arrival/deposit dates, larger lump sums, " +
        "a weekly cadence. If rows have CPT codes or one row per appointment, they are sessions: use bulk_log_sessions instead. " +
        "If the data is mixed or you can't tell, or the payer is unclear, ASK the user rather than guessing. " +
        "ALWAYS call with dry_run=true first, show the user the summary (the detected grain sentence, counts, total, date range, " +
        "any overlap warnings and invalid rows) and only call with dry_run=false after they confirm. " +
        `Max ${MAX_ROWS} rows per call: for more, send chunks, and pass the batch_id returned by the first saved chunk on every later chunk. ` +
        "Never put client names anywhere, including raw.",
      inputSchema: importPayoutsInput,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const prepared = await preparePayouts(supabase, input.payouts);
        return await runImport(supabase, therapist.id, input, input.payouts.length, prepared, async (rows, batchId) => {
          const { data, error } = await insertPayouts(
            supabase,
            therapist.id,
            rows.map((r) => ({ ...r, import_batch_id: batchId }))
          );
          return { error, count: data?.length ?? 0 };
        });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "bulk_log_sessions",
    {
      title: "Bulk log sessions",
      description:
        "Bulk-import session history: one row per appointment the provider HELD (date, amount, CPT code, payer, state, and optionally the " +
        "platform it went through, e.g. Grow Therapy). Extract rows from whatever the user gives you (CSV, spreadsheet, pasted text, screenshot). " +
        "Session signals: one row per appointment, CPT codes, per-session amounts (roughly $100–$200), session dates. " +
        "If rows look like payouts (po_ IDs, arrival dates, weekly lump sums), use import_payouts instead; if unclear, ASK. " +
        "Map payer names to Therapay's payer list and show the user any mapping you weren't sure of. " +
        "NEVER include client names, initials or other client details: drop those columns entirely. " +
        "ALWAYS call with dry_run=true first, show the summary, and only call with dry_run=false after the user confirms. " +
        `Max ${MAX_ROWS} rows per call; chunk larger imports and pass the batch_id from the first saved chunk on every later chunk.`,
      inputSchema: bulkSessionsInput,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const prepared = await prepareSessions(supabase, input.sessions);
        return await runImport(supabase, therapist.id, input, input.sessions.length, prepared, async (rows, batchId) => {
          const { data, error } = await insertSessions(
            supabase,
            therapist.id,
            rows.map((r) => ({ ...r, import_batch_id: batchId }))
          );
          return { error, count: data?.length ?? 0 };
        });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "undo_import",
    {
      title: "Undo an import",
      description:
        "Delete every session or payout saved by one bulk import. Call first without confirm to see what would be removed, " +
        "tell the user, and only call with confirm=true after they explicitly agree. Use list_imports to find batch IDs.",
      inputSchema: z.object({
        batch_id: z.string().uuid().describe("The import's batch_id"),
        confirm: z.boolean().default(false).describe("true deletes the batch and all its rows; false only shows what would be deleted"),
      }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const { data: batch, error } = await getBatch(supabase, therapist.id, input.batch_id);
        if (error) return fail(`Could not load batch: ${error.message}`);
        if (!batch) return fail(`No import batch ${input.batch_id} found (it may already be undone).`);
        const { count, total } = await batchContents(supabase, batch);
        const what = `${count} ${batch.grain}${count === 1 ? "" : "s"} totalling ${usd(total)} imported ${batch.created_at.slice(0, 10)}`;
        if (!input.confirm) {
          return text({ deleted: false, batch_id: batch.id, would_delete: { count, total, grain: batch.grain }, message: `This would delete ${what}. Ask the user to confirm, then call again with confirm=true.` });
        }
        const { error: delError } = await deleteBatch(supabase, therapist.id, batch.id);
        if (delError) return fail(`Could not undo the import: ${delError.message}`);
        return text({ deleted: true, batch_id: batch.id, removed: { count, total, grain: batch.grain }, message: `Deleted ${what}.` });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "list_imports",
    {
      title: "List imports",
      description: "List the provider's bulk imports (newest first) with grain, row counts and dates, e.g. to find a batch_id to undo.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async (_input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const { data, error } = await listBatches(supabase, therapist.id);
        if (error) return fail(`Could not load imports: ${error.message}`);
        return text({ imports: data });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "list_payouts",
    {
      title: "List payouts",
      description:
        `Return the provider's payouts (cash actually received: date, amount, payer, status, period covered), newest first, up to ${LIST_LIMIT} rows. ` +
        "Optionally filter by date range or payer. Use it for 'what did I actually get paid' questions; list_sessions answers 'what did I earn'. " +
        "Don't add payouts and sessions together for income: use get_reconciliation for a combined, non-double-counted total.",
      inputSchema: z.object({
        start_date: z.string().regex(DATE).optional().describe("Only payouts on or after this date (YYYY-MM-DD)"),
        end_date: z.string().regex(DATE).optional().describe("Only payouts on or before this date (YYYY-MM-DD)"),
        payer: z.string().optional().describe("Only payouts from this payer/platform"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const { data, error } = await listPayouts(supabase, therapist.id, {
          from: input.start_date?.slice(0, 10),
          to: input.end_date ? dayAfter(input.end_date) : undefined,
          payer: input.payer,
          limit: LIST_LIMIT + 1,
        });
        if (error) return fail(`Could not load payouts: ${error.message}`);
        const rows = data ?? [];
        const shown = rows.slice(0, LIST_LIMIT);
        return text({
          count: shown.length,
          truncated: rows.length > LIST_LIMIT,
          total_paid: round(shown.filter((p) => p.status === "paid").reduce((t, p) => t + Number(p.amount), 0)),
          payouts: shown,
        });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "get_reconciliation",
    {
      title: "Reconcile earnings vs payouts",
      description:
        "Compare what the provider earned (logged sessions = expected) with what they were paid (payouts = received), per payer per month " +
        "(or week). Each row has expected, received, difference and a status: matched, underpaid, overpaid_or_unlogged_sessions, " +
        "payout_missing, awaiting_payout (recent work whose money may still be on the way) or sessions_missing (payouts with no logged " +
        "sessions: still real income, but per-session metrics aren't available). totals.income is the best non-double-counted income figure. " +
        "Payouts are the truth for cash received, sessions for work performed: never suggest editing one to match the other; describe the gap.",
      inputSchema: z.object({
        start_date: z.string().regex(DATE).describe("Start of the range (YYYY-MM-DD)"),
        end_date: z.string().regex(DATE).describe("End of the range (YYYY-MM-DD)"),
        payer: z.string().optional().describe("Only this payer or platform, e.g. Grow Therapy"),
        granularity: z.enum(["month", "week"]).default("month").describe("month (default; less noisy) or week"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (input, ctx: Ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        if (input.end_date < input.start_date) return fail("end_date is before start_date.");
        const recon = await loadReconciliation(supabase, therapist.id, {
          start: input.start_date.slice(0, 10),
          end: input.end_date.slice(0, 10),
          payers: input.payer ? [input.payer] : undefined,
          granularity: input.granularity,
        });
        return text(recon);
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );
}
