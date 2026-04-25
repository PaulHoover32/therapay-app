import initSqlJs from "sql.js";
import { readFileSync } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type RecommendationRow = Database["public"]["Tables"]["recommendations"]["Row"];
type ReferencePayerRow = Database["public"]["Tables"]["reference_payers"]["Row"];
type ReferenceSessionCodeRow = Database["public"]["Tables"]["reference_session_codes"]["Row"];

// Cache the sql.js runtime across requests — loads WASM once per process
let sqlJsRuntime: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlJs() {
  if (!sqlJsRuntime) {
    const buf = readFileSync(
      join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm")
    );
    const wasmBinary = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
    sqlJsRuntime = await initSqlJs({ wasmBinary });
  }
  return sqlJsRuntime;
}

export async function buildUserDb(
  supabase: SupabaseClient,
  therapistId: string,
  userId: string
) {
  const [
    { data: sessions },
    { data: goals },
    { data: recommendations },
    { data: refPayers },
    { data: refSessionCodes },
  ] = await Promise.all([
    supabase.from("sessions").select("*").eq("therapist_id", therapistId),
    supabase.from("goals").select("*").eq("user_id", userId).eq("is_active", true),
    supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    supabase.from("reference_payers").select("*").eq("active", true),
    supabase.from("reference_session_codes").select("*").eq("active", true),
  ]);

  // Build lookup maps from reference tables
  const payerTypeMap = new Map<string, string>();
  (refPayers as ReferencePayerRow[] ?? []).forEach((p) =>
    payerTypeMap.set(p.name, p.payment_option)
  );

  const sessionDurationMap = new Map<string, number>();
  (refSessionCodes as ReferenceSessionCodeRow[] ?? []).forEach((sc) =>
    sessionDurationMap.set(sc.code, sc.session_duration)
  );

  const SQL = await getSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      session_datetime TEXT,
      amount REAL,
      session_duration INTEGER,
      payer TEXT,
      payer_type TEXT,
      session_code TEXT,
      state TEXT
    );
    CREATE TABLE goals (
      id TEXT PRIMARY KEY,
      goal_year INTEGER,
      annual_income_target REAL,
      target_weekly_hours REAL,
      target_avg_payout REAL,
      is_active INTEGER,
      last_modified_at TEXT,
      last_modified_by TEXT,
      optimization_preference TEXT
    );
    CREATE TABLE recommendations (
      id TEXT PRIMARY KEY,
      created_at TEXT,
      annual_income_target REAL,
      target_weekly_hours REAL,
      target_avg_payout REAL,
      summary TEXT,
      ytd_revenue_at_time REAL,
      avg_weekly_hours_at_time REAL,
      avg_payout_at_time REAL,
      weeks_remaining_at_input INTEGER
    );
  `);

  if (sessions?.length) {
    const stmt = db.prepare(
      `INSERT INTO sessions
        (id, session_datetime, amount, session_duration, payer, payer_type, session_code, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    (sessions as SessionRow[]).forEach((s) => {
      stmt.run([
        s.id,
        s.session_datetime,
        s.amount,
        sessionDurationMap.get(s.session_code) ?? null,
        s.payer,
        payerTypeMap.get(s.payer) ?? "insurance",
        s.session_code,
        s.state,
      ]);
    });
    stmt.free();
  }

  if (goals?.length) {
    const stmt = db.prepare(
      `INSERT INTO goals
        (id, goal_year, annual_income_target, target_weekly_hours, target_avg_payout,
         is_active, last_modified_at, last_modified_by, optimization_preference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    (goals as GoalRow[]).forEach((g) => {
      stmt.run([
        g.id,
        g.goal_year,
        g.annual_income_target,
        g.target_weekly_hours,
        g.target_avg_payout,
        g.is_active ? 1 : 0,
        g.last_modified_at,
        g.last_modified_by,
        g.optimization_preference ?? null,
      ]);
    });
    stmt.free();
  }

  if (recommendations?.length) {
    const stmt = db.prepare(
      `INSERT INTO recommendations
        (id, created_at, annual_income_target, target_weekly_hours, target_avg_payout,
         summary, ytd_revenue_at_time, avg_weekly_hours_at_time, avg_payout_at_time,
         weeks_remaining_at_input)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    (recommendations as RecommendationRow[]).forEach((r) => {
      stmt.run([
        r.id,
        r.created_at,
        r.annual_income_target,
        r.target_weekly_hours,
        r.target_avg_payout,
        r.summary,
        r.ytd_revenue_at_time,
        r.avg_weekly_hours_at_time,
        r.avg_payout_at_time,
        r.weeks_remaining_at_input,
      ]);
    });
    stmt.free();
  }

  return db;
}
