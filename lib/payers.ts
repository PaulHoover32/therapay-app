import type { SupabaseClient } from "@supabase/supabase-js";

// Payer name matching. Known names come from the reference tables; a therapist can also add their
// own, which live only on their own rows (RLS), so nobody else ever sees them. Loose for now: the
// vetted shared catalog in docs/designs/next-enhancements.md (U3) is the planned tightening.

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Placeholder rows left in reference_payers; never offered or matched. */
export const isJunkPayer = (name: string) => /^Payer_\d+$/.test(name);

/**
 * Exact (case-insensitive) match, else for a one-word input a unique match on the first word
 * ("Grow" → "Grow Therapy"). A longer name that merely starts the same ("United Behavioral" vs
 * "United Healthcare") is a different payer, so it doesn't match.
 */
export function resolveName(input: string | undefined, names: string[]) {
  if (!input?.trim()) return null;
  const n = norm(input);
  const exact = names.find((name) => norm(name) === n);
  if (exact) return exact;
  if (n.includes(" ")) return null;
  const byWord = names.filter((name) => norm(name).split(" ")[0] === n);
  return byWord.length === 1 ? byWord[0] : null;
}

function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Existing names a new one might be a typo or variant of. */
export function similarNames(name: string, names: string[]) {
  const n = norm(name);
  const first = n.split(" ")[0];
  return names
    .filter((candidate) => {
      const c = norm(candidate);
      return c.split(" ")[0] === first || editDistance(c, n) <= 2;
    })
    .slice(0, 3);
}

export type ResolvedPayer = { name: string; isNew: boolean; similar: string[] } | { error: string };

/** A known or already-used name, else a new one if it's a plausible name. */
export function resolvePayer(input: string | undefined, names: string[]): ResolvedPayer {
  const match = resolveName(input, names);
  if (match) return { name: match, isNew: false, similar: [] };
  const name = (input ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { error: "A payer name is required." };
  if (name.length > 60) return { error: `Payer name "${name.slice(0, 60)}…" is over 60 characters.` };
  if (!/^[\p{L}\d &.,'’\-/()]+$/u.test(name) || !/\p{L}/u.test(name)) {
    return { error: `Payer name "${name}" can only use letters, digits, spaces and & . , ' - / ( ).` };
  }
  if (isJunkPayer(name)) return { error: `"${name}" is a placeholder, not a payer.` };
  return { name, isNew: true, similar: similarNames(name, names) };
}

/** Every payer or platform name this therapist has already saved, including ones they added. */
export async function ownPayerNames(supabase: SupabaseClient, therapistId: string) {
  const names = new Set<string>();
  for (const table of ["payouts", "payer_rates", "monthly_volume"]) {
    const columns = table === "payouts" ? "payer" : "payer, platform";
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq("therapist_id", therapistId)
        .order("id")
        .range(start, start + 999)
        .returns<{ payer: string; platform?: string | null }[]>();
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        names.add(row.payer);
        if (row.platform) names.add(row.platform);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return [...names];
}
