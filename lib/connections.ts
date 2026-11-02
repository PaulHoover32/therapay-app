import type { SupabaseClient } from "@supabase/supabase-js";

// Which AI apps (OAuth clients) a user has connected. Supabase holds the grants (the user said
// Allow); mcp_connections records that the app actually reached the MCP server.

export interface AiConnection {
  clientId: string;
  name: string;
  grantedAt: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  /** The MCP server has seen at least one authenticated request from this app */
  connected: boolean;
}

// Avoid a database write on every MCP request: once per user/app per warm instance per window
const TOUCH_EVERY_MS = 5 * 60 * 1000;
const lastTouch = new Map<string, number>();

/** Record an authenticated MCP request from an OAuth client, as the user (RLS). */
export async function touchConnection(supabase: SupabaseClient, userId: string, clientId: string) {
  const key = `${userId}:${clientId}`;
  const now = Date.now();
  if (now - (lastTouch.get(key) ?? 0) < TOUCH_EVERY_MS) return;
  lastTouch.set(key, now);
  const { error } = await supabase
    .from("mcp_connections")
    .upsert({ user_id: userId, client_id: clientId, last_seen_at: new Date(now).toISOString() }, { onConflict: "user_id,client_id" });
  if (error) {
    lastTouch.delete(key);
    console.error("mcp_connections upsert failed", error.message);
  }
}

/** The signed-in user's AI apps: approved grants joined with what the MCP server has seen. */
export async function listConnections(supabase: SupabaseClient): Promise<AiConnection[]> {
  const [{ data: grants }, { data: seen }] = await Promise.all([
    supabase.auth.oauth.listGrants(),
    supabase.from("mcp_connections").select("client_id, first_seen_at, last_seen_at"),
  ]);
  const seenById = new Map((seen ?? []).map((s) => [s.client_id as string, s]));
  const rows: AiConnection[] = (grants ?? []).map((g) => {
    const s = seenById.get(g.client.id);
    seenById.delete(g.client.id);
    return {
      clientId: g.client.id,
      name: g.client.name || "AI app",
      grantedAt: g.granted_at,
      firstSeenAt: s?.first_seen_at ?? null,
      lastSeenAt: s?.last_seen_at ?? null,
      connected: Boolean(s),
    };
  });
  // Seen but no longer granted (revoked): leave out; their tokens no longer work
  return rows.sort((a, b) => (b.lastSeenAt ?? b.grantedAt ?? "").localeCompare(a.lastSeenAt ?? a.grantedAt ?? ""));
}
