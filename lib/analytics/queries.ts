import { z } from "zod";
import type { Database as SqlJsDatabase } from "sql.js";

// Named, parameterized queries against the in-memory analytics DB built by
// buildUserDb(). Panels and assistant tools both read through these so the
// numbers on screen always match what the assistant says.
//
// "anchor" = the latest session date, so a therapist whose data stops in a
// prior year still sees a meaningful trailing window (same rule as getTherapistContext).

const ANCHOR = `(SELECT date(max(session_datetime)) FROM sessions)`;
const WEEK_START = `date(session_datetime, 'weekday 0', '-6 days')`;

export const NAMED_QUERIES = {
  summary: {
    params: z.object({}),
    sql: `
      WITH a AS (SELECT ${ANCHOR} AS anchor),
      y AS (SELECT CAST(strftime('%Y', anchor) AS INTEGER) AS yr FROM a)
      SELECT
        (SELECT anchor FROM a)                                              AS anchor_date,
        (SELECT yr FROM y)                                                  AS effective_year,
        (SELECT count(*) FROM sessions)                                     AS total_sessions,
        (SELECT coalesce(sum(amount), 0) FROM sessions
           WHERE CAST(strftime('%Y', session_datetime) AS INTEGER) = (SELECT yr FROM y))     AS ytd_revenue,
        (SELECT count(*) FROM sessions
           WHERE CAST(strftime('%Y', session_datetime) AS INTEGER) = (SELECT yr FROM y))     AS ytd_sessions,
        (SELECT sum(amount) FROM sessions
           WHERE CAST(strftime('%Y', session_datetime) AS INTEGER) = (SELECT yr FROM y) - 1) AS prior_year_revenue,
        -- Pace projection uses the real calendar: earnings so far this year ÷ days elapsed × 365.
        -- Null when the latest data is from a prior year.
        CASE WHEN (SELECT yr FROM y) = CAST(strftime('%Y', 'now') AS INTEGER) THEN
          round((SELECT coalesce(sum(amount), 0) FROM sessions
                   WHERE CAST(strftime('%Y', session_datetime) AS INTEGER) = (SELECT yr FROM y))
                / (julianday(date('now')) - julianday(date('now', 'start of year')) + 1) * 365)
        END                                                                 AS projected_annual,
        (SELECT coalesce(sum(amount), 0) FROM sessions, a
           WHERE date(session_datetime) > date(anchor, '-28 days'))         AS last28_revenue,
        (SELECT count(*) FROM sessions, a
           WHERE date(session_datetime) > date(anchor, '-28 days'))         AS last28_sessions,
        (SELECT coalesce(sum(session_duration), 0) / 60.0 FROM sessions, a
           WHERE date(session_datetime) > date(anchor, '-28 days'))         AS last28_hours,
        (SELECT count(DISTINCT date(session_datetime)) FROM sessions, a
           WHERE date(session_datetime) > date(anchor, '-28 days'))         AS last28_days,
        (SELECT coalesce(sum(amount), 0) FROM sessions, a
           WHERE date(session_datetime) >  date(anchor, '-56 days')
             AND date(session_datetime) <= date(anchor, '-28 days'))        AS prev28_revenue,
        (SELECT count(*) FROM sessions, a
           WHERE date(session_datetime) >  date(anchor, '-56 days')
             AND date(session_datetime) <= date(anchor, '-28 days'))        AS prev28_sessions,
        (SELECT annual_income_target FROM goals WHERE is_active = 1
           ORDER BY goal_year DESC LIMIT 1)                                 AS goal_annual_target,
        (SELECT target_weekly_hours FROM goals WHERE is_active = 1
           ORDER BY goal_year DESC LIMIT 1)                                 AS goal_weekly_hours,
        (SELECT target_avg_payout FROM goals WHERE is_active = 1
           ORDER BY goal_year DESC LIMIT 1)                                 AS goal_avg_payout,
        (SELECT goal_year FROM goals WHERE is_active = 1
           ORDER BY goal_year DESC LIMIT 1)                                 AS goal_year
    `,
  },

  weeklyRevenue: {
    params: z.object({ weeks: z.coerce.number().int().min(1).max(104).default(12) }),
    sql: `
      SELECT ${WEEK_START} AS week_start,
             round(sum(amount), 2)                 AS revenue,
             count(*)                              AS sessions,
             round(sum(session_duration) / 60.0, 1) AS hours
      FROM sessions
      WHERE date(session_datetime) > date(${ANCHOR}, '-' || ($weeks * 7) || ' days')
      GROUP BY week_start
      ORDER BY week_start
    `,
  },

  cumulativeYtd: {
    params: z.object({}),
    sql: `
      WITH yr AS (SELECT strftime('%Y', ${ANCHOR}) AS y),
      w AS (
        SELECT ${WEEK_START} AS week_start, sum(amount) AS revenue
        FROM sessions, yr
        WHERE strftime('%Y', session_datetime) = yr.y
        GROUP BY week_start
      )
      SELECT week_start,
             round(revenue, 2)                                    AS revenue,
             round(sum(revenue) OVER (ORDER BY week_start), 2)    AS cumulative
      FROM w
      ORDER BY week_start
    `,
  },

  monthlyRevenue: {
    params: z.object({ months: z.coerce.number().int().min(1).max(36).default(12) }),
    sql: `
      SELECT strftime('%Y-%m', session_datetime) AS month,
             round(sum(amount), 2)               AS revenue,
             count(*)                            AS sessions
      FROM sessions
      WHERE date(session_datetime) > date(${ANCHOR}, 'start of month', '-' || ($months - 1) || ' months', '-1 day')
      GROUP BY month
      ORDER BY month
    `,
  },

  payerMix: {
    params: z.object({ days: z.coerce.number().int().min(1).max(3650).default(365) }),
    sql: `
      SELECT payer,
             payer_type,
             count(*)                    AS sessions,
             round(sum(amount), 2)       AS revenue,
             round(avg(amount), 2)       AS avg_payout
      FROM sessions
      WHERE date(session_datetime) > date(${ANCHOR}, '-' || $days || ' days')
      GROUP BY payer, payer_type
      ORDER BY revenue DESC
    `,
  },

  recentSessions: {
    params: z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }),
    sql: `
      SELECT id, session_datetime, amount, payer, payer_type, session_code, session_duration, state
      FROM sessions
      ORDER BY session_datetime DESC
      LIMIT $limit
    `,
  },
} as const;

export type QueryName = keyof typeof NAMED_QUERIES;
export type Row = Record<string, string | number | null>;

export function isQueryName(name: string): name is QueryName {
  return Object.prototype.hasOwnProperty.call(NAMED_QUERIES, name);
}

function toRows(db: SqlJsDatabase, sql: string, bind?: Record<string, number | string>): Row[] {
  const stmt = db.prepare(sql);
  try {
    if (bind) stmt.bind(bind);
    const rows: Row[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as Row);
    return rows;
  } finally {
    stmt.free();
  }
}

export function runNamedQuery(db: SqlJsDatabase, name: QueryName, rawParams: Record<string, unknown> = {}): Row[] {
  const def = NAMED_QUERIES[name];
  const params = def.params.parse(rawParams) as Record<string, number>;
  const bind = Object.fromEntries(Object.entries(params).map(([k, v]) => [`$${k}`, v]));
  return toRows(db, def.sql, Object.keys(bind).length ? bind : undefined);
}

const MAX_ROWS = 200;
const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex)\b/i;

// Ad-hoc SELECT (model-authored charts). Single statement, read-only, row-capped.
export function runSelect(db: SqlJsDatabase, sql: string): { rows: Row[]; truncated: boolean } {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(trimmed) || trimmed.includes(";") || FORBIDDEN.test(trimmed)) {
    throw new Error("Only a single read-only SELECT query is allowed.");
  }
  const rows = toRows(db, trimmed);
  return { rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS };
}
