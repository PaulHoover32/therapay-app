import type { SupabaseClient } from "@supabase/supabase-js";

// Import batches group bulk-imported payouts so a whole import can be reviewed or
// undone. Duplicates are never blocked (rows are anonymized, so identical rows are legitimate);
// instead, an import that overlaps existing rows of the same grain and payer gets a warning.

export type Grain = "payout";

export const BATCH_COLUMNS = "id, source, grain, filename, row_count, inserted_count, created_at, updated_at";

export interface BatchRow {
  id: string;
  source: string;
  grain: Grain;
  filename: string | null;
  row_count: number;
  inserted_count: number;
  created_at: string;
  updated_at: string;
}

export interface Overlap {
  payer: string;
  from: string;
  to: string;
  new_count: number;
  new_total: number;
  existing_count: number;
  existing_total: number;
  message: string;
}

const TABLE = { payout: "payouts" } as const;
const DATE_COLUMN = { payout: "payout_date" } as const;

const round = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function dayAfter(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function formatRange(from: string, to: string) {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  if (from === to) return fmt(from, { month: "short", day: "numeric", year: "numeric" });
  if (from.slice(0, 7) === to.slice(0, 7)) return `${fmt(from, { month: "short", day: "numeric" })}–${fmt(to, { day: "numeric" })}, ${from.slice(0, 4)}`;
  return `${fmt(from, { month: "short", day: "numeric", year: "numeric" })} – ${fmt(to, { month: "short", day: "numeric", year: "numeric" })}`;
}

export async function getBatch(supabase: SupabaseClient, therapistId: string, id: string) {
  return supabase
    .from("import_batches")
    .select(BATCH_COLUMNS)
    .eq("therapist_id", therapistId)
    .eq("id", id)
    .maybeSingle<BatchRow>();
}

export async function createBatch(supabase: SupabaseClient, therapistId: string, grain: Grain, filename?: string) {
  return supabase
    .from("import_batches")
    .insert({ therapist_id: therapistId, grain, filename: filename ?? null })
    .select(BATCH_COLUMNS)
    .single<BatchRow>();
}

/** Add one chunk's counts to a batch. */
export async function extendBatch(supabase: SupabaseClient, batch: BatchRow, rows: number, inserted: number) {
  return supabase
    .from("import_batches")
    .update({ row_count: batch.row_count + rows, inserted_count: batch.inserted_count + inserted })
    .eq("id", batch.id)
    .select(BATCH_COLUMNS)
    .single<BatchRow>();
}

export async function listBatches(supabase: SupabaseClient, therapistId: string, limit = 50) {
  return supabase
    .from("import_batches")
    .select(BATCH_COLUMNS)
    .eq("therapist_id", therapistId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<BatchRow[]>();
}

/** How many rows a batch currently holds and what they add up to. */
export async function batchContents(supabase: SupabaseClient, batch: BatchRow) {
  const { data, error } = await supabase.from(TABLE[batch.grain]).select("amount").eq("import_batch_id", batch.id);
  if (error) throw new Error(error.message);
  return { count: data.length, total: round(data.reduce((t, r) => t + Number(r.amount), 0)) };
}

/** Deleting the batch removes its payouts too (on delete cascade). */
export async function deleteBatch(supabase: SupabaseClient, therapistId: string, id: string) {
  return supabase.from("import_batches").delete().eq("therapist_id", therapistId).eq("id", id);
}

/**
 * For each payer in the incoming rows, find existing rows of the same grain and payer inside the
 * incoming date range. Rows already saved under `excludeBatchId` (earlier chunks of the same
 * import) don't count.
 */
export async function findOverlaps(
  supabase: SupabaseClient,
  therapistId: string,
  grain: Grain,
  rows: { payer: string; date: string; amount: number }[],
  excludeBatchId?: string
): Promise<Overlap[]> {
  const byPayer = new Map<string, { from: string; to: string; count: number; total: number }>();
  for (const r of rows) {
    const g = byPayer.get(r.payer);
    if (!g) byPayer.set(r.payer, { from: r.date, to: r.date, count: 1, total: r.amount });
    else {
      if (r.date < g.from) g.from = r.date;
      if (r.date > g.to) g.to = r.date;
      g.count += 1;
      g.total += r.amount;
    }
  }

  const noun = "payouts";
  const overlaps = await Promise.all(
    [...byPayer].map(async ([payer, g]) => {
      let query = supabase
        .from(TABLE[grain])
        .select("amount")
        .eq("therapist_id", therapistId)
        .eq("payer", payer)
        .gte(DATE_COLUMN[grain], g.from)
        .lt(DATE_COLUMN[grain], dayAfter(g.to))
        .limit(10000);
      if (excludeBatchId) query = query.or(`import_batch_id.is.null,import_batch_id.neq.${excludeBatchId}`);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      if (!data.length) return null;
      const existing_total = round(data.reduce((t, r) => t + Number(r.amount), 0));
      return {
        payer,
        from: g.from,
        to: g.to,
        new_count: g.count,
        new_total: round(g.total),
        existing_count: data.length,
        existing_total,
        message:
          `You already have ${data.length} ${payer} ${noun} from ${formatRange(g.from, g.to)} totalling ${usd(existing_total)}. ` +
          `Add these ${g.count} anyway?`,
      };
    })
  );
  return overlaps.filter((o): o is Overlap => o !== null);
}

/** A real Stripe payout ID; only these are unique per therapist (see payouts_stripe_payout_id_unique). */
export const isStripePayoutId = (id: string | null | undefined): id is string => !!id && id.startsWith("po_");

/**
 * Splits rows into ones to save and repeats to skip: a Stripe payout ID already stored, or seen
 * earlier in the same file. Rows without a Stripe ID are never skipped (identical-looking rows are
 * legitimate). Used by both the dry run and the real import, so the preview matches what's saved.
 */
export function splitDuplicates<V>(rows: V[], idOf: (row: V) => string | null | undefined, existing: Set<string>) {
  const seen = new Set<string>();
  const keep: V[] = [];
  const skipped: { row: V; external_id: string; reason: "already_imported" | "repeated_in_file" }[] = [];
  for (const row of rows) {
    const id = idOf(row);
    if (!isStripePayoutId(id)) {
      keep.push(row);
    } else if (existing.has(id)) {
      skipped.push({ row, external_id: id, reason: "already_imported" });
    } else if (seen.has(id)) {
      skipped.push({ row, external_id: id, reason: "repeated_in_file" });
    } else {
      seen.add(id);
      keep.push(row);
    }
  }
  return { keep, skipped };
}

/** Which of these Stripe payout IDs this therapist already has. */
export async function existingStripeIds(supabase: SupabaseClient, therapistId: string, ids: string[]) {
  const found = new Set<string>();
  const unique = [...new Set(ids.filter(isStripePayoutId))];
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await supabase
      .from("payouts")
      .select("external_id")
      .eq("therapist_id", therapistId)
      .in("external_id", unique.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) if (r.external_id) found.add(r.external_id);
  }
  return found;
}
