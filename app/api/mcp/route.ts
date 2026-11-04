import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTherapayTools } from "@/lib/mcp/tools";
import { verifySupabaseToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";

const handler = createMcpHandler(registerTherapayTools, {
  serverInfo: { name: "therapay", version: "0.1.0" },
  instructions:
    "Therapay tracks a 1099 therapist's income from payouts (cash actually received: Stripe or platform deposits). " +
    "Import payout history with import_payouts, always dry-run first. Therapay never stores per-session records: " +
    "don't send appointment dates, CPT codes per session or anything about clients to any tool. " +
    "Never send client or patient names to any tool.",
});

const authed = withMcpAuth(handler, verifySupabaseToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authed as GET, authed as POST, authed as DELETE };
