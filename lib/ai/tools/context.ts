import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database as SqlJsDatabase } from "sql.js";
import { buildUserDb } from "@/lib/userDb";

export interface ToolLogEntry {
  tool_name: string;
  status: "success" | "error" | "denied";
  input: unknown;
  output: unknown;
  duration_ms: number | null;
}

// Everything a tool needs, created once per chat request
export interface ToolContext {
  supabase: SupabaseClient;
  user: User;
  therapistId: string | undefined;
  threadId: string | null;
  validPayerNames: string[];
  getDb: () => Promise<SqlJsDatabase>;
  logs: ToolLogEntry[];
  // Set by saveGoals so the thread can be linked to the recommendation once it's saved
  recommendationId?: string;
}

export function createToolContext(
  init: Omit<ToolContext, "getDb" | "logs">
): ToolContext & { dispose: () => void } {
  let db: Promise<SqlJsDatabase> | null = null;
  return {
    ...init,
    logs: [],
    // Built lazily: most turns never touch the analytics DB
    getDb: () => (db ??= buildUserDb(init.supabase, init.therapistId ?? "", init.user.id)),
    dispose: () => {
      void db?.then((d) => d.close());
      db = null;
    },
  };
}
