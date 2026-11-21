import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTherapayTools } from "@/lib/mcp/tools";
import { verifySupabaseToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";

const handler = createMcpHandler(registerTherapayTools, {
  serverInfo: { name: "therapay", version: "0.1.0" },
  instructions:
    "Therapay tells a 1099 therapist whether they're on track this year. Income comes ONLY from payouts (cash received: " +
    "Stripe or platform deposits, imported with import_payouts, always dry-run first). Their rate card (set_rate_card to save, list_rate_cards to show: what each " +
    "payer pays per CPT code) and monthly counts (log_month: sessions per payer and code, no-shows) are for payer-mix analysis " +
    "and never count as income. Use check_in for 'how am I doing?' and set_goal for their income goal. For payout data, explain " +
    "the options (Stripe Express export, platform statement, bank statement) and recommend one. Therapay never stores " +
    "per-session records: never ask for or send appointment dates, client names, initials or any client detail. " +
    "Sanity-check every figure before presenting it: if a number looks implausible for a solo therapist (e.g. far more " +
    "sessions than they could see, income that jumped without explanation), say so plainly, name the likely cause (duplicate " +
    "import, counts not logged, an outdated rate) and ask before building advice on it. " +
    "Use get_profile to show their profile and setup_profile to change it. Payers not on the known list can be added: confirm " +
    "the spelling first, and never use a client's name as a payer (private-pay clients go under Cash). To fix a mistake use rename_payer, delete_rates or delete_month_counts, previewing first. Refer to the therapist " +
    "with they/them unless they tell you their pronouns.",
});

const authed = withMcpAuth(handler, verifySupabaseToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authed as GET, authed as POST, authed as DELETE };
