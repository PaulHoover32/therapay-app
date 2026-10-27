import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as SqlJsDatabase } from "sql.js";
import { buildUserDb } from "@/lib/userDb";

// Builds the user's in-memory analytics DB, runs fn, and always frees it.
export async function withUserDb<T>(
  supabase: SupabaseClient,
  userId: string,
  fn: (db: SqlJsDatabase) => T | Promise<T>
): Promise<T> {
  const { data: therapist } = await supabase
    .from("therapists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const db = await buildUserDb(supabase, therapist?.id ?? "", userId);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}
