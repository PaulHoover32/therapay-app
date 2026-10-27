import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withUserDb } from "@/lib/analytics/withUserDb";
import { isQueryName, runNamedQuery, runSelect } from "@/lib/analytics/queries";

export const runtime = "nodejs";

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// GET /api/analytics?q=<name>&<param>=<value> — runs a named query
export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { q, ...rest } = params;
  if (!q || !isQueryName(q)) {
    return NextResponse.json({ error: "Unknown query" }, { status: 400 });
  }

  try {
    const rows = await withUserDb(supabase, user.id, (db) => runNamedQuery(db, q, rest));
    return NextResponse.json({ rows });
  } catch (e) {
    const message = e instanceof z.ZodError ? "Invalid parameters" : (e as Error).message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const selectBody = z.object({ sql: z.string().min(1).max(4000) });

// POST /api/analytics { sql } — runs a read-only SELECT for model-defined charts
export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = selectBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const result = await withUserDb(supabase, user.id, (db) => runSelect(db, parsed.data.sql));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
