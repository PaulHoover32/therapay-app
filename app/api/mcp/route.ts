import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTherapayTools } from "@/lib/mcp/tools";
import { verifySupabaseToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";

const handler = createMcpHandler(registerTherapayTools, {
  serverInfo: { name: "therapay", version: "0.1.0" },
  instructions:
    "Therapay tells a 1099 therapist whether she's on track this year. Income comes ONLY from payouts (cash received: " +
    "Stripe or platform deposits, imported with import_payouts, always dry-run first). Her rate card (set_rate_card: what each " +
    "payer pays per CPT code) and monthly counts (log_month: sessions per payer and code, no-shows) are for payer-mix analysis " +
    "and never count as income. Use check_in for 'how am I doing?' and set_goal for her income goal. For payout data, explain " +
    "the options (Stripe Express export, platform statement, bank statement) and recommend one. Therapay never stores " +
    "per-session records: never ask for or send appointment dates, client names, initials or any client detail.",
});

const authed = withMcpAuth(handler, verifySupabaseToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authed as GET, authed as POST, authed as DELETE };
