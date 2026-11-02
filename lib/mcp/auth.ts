import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { touchConnection } from "@/lib/connections";

// Supabase Auth is the OAuth 2.1 authorization server for MCP clients (Claude, ChatGPT).
// The access tokens it issues are ordinary Supabase user JWTs, so a client created with the
// token runs every query as that user under RLS: no service-role key anywhere.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const AUTH_SERVER_URL = `${SUPABASE_URL}/auth/v1`;

export function supabaseForToken(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// getClaims only checks the signature, so a token stays valid until it expires even after the
// user disconnects the app (revoking the grant deletes its session). Ask the auth server whether
// the session still exists, remembering a "yes" briefly so it isn't a round trip per request.
const LIVE_FOR_MS = 60 * 1000;
const liveUntil = new Map<string, number>();

async function sessionIsLive(token: string) {
  const now = Date.now();
  if ((liveUntil.get(token) ?? 0) > now) return true;
  const { data, error } = await supabaseForToken(token).auth.getUser(token);
  if (error || !data.user) {
    liveUntil.delete(token);
    return false;
  }
  if (liveUntil.size > 1000) liveUntil.clear();
  liveUntil.set(token, now + LIVE_FOR_MS);
  return true;
}

export async function verifySupabaseToken(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const { data, error } = await supabaseForToken(token).auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub || claims.role !== "authenticated") return undefined;
  if (!(await sessionIsLive(token))) return undefined;
  // OAuth-issued tokens carry the client_id: note that this AI app is connected (powers the
  // connection status on /connect and /account)
  if (typeof claims.client_id === "string") {
    await touchConnection(supabaseForToken(token), claims.sub, claims.client_id);
  }
  return {
    token,
    // OAuth-issued tokens carry the client_id; a plain app session token doesn't
    clientId: typeof claims.client_id === "string" ? claims.client_id : "therapay",
    scopes: typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [],
    expiresAt: claims.exp,
    extra: { userId: claims.sub },
  };
}

export interface McpUser {
  supabase: SupabaseClient;
  userId: string;
}

// withMcpAuth (required: true) guarantees authInfo is set before any tool runs.
export function mcpUser(authInfo: AuthInfo | undefined): McpUser {
  const userId = authInfo?.extra?.userId;
  if (!authInfo || typeof userId !== "string") throw new Error("Not signed in to Therapay.");
  return { supabase: supabaseForToken(authInfo.token), userId };
}
