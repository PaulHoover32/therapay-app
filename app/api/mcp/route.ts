import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTherapayTools } from "@/lib/mcp/tools";
import { verifySupabaseToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";

const handler = createMcpHandler(registerTherapayTools, {
  serverInfo: { name: "therapay", version: "0.1.0" },
  instructions:
    "Therapay tracks a 1099 therapist's sessions (work performed, what they earned) and payouts (cash actually received). " +
    "Bulk history goes through bulk_log_sessions or import_payouts: decide which from the data (CPT codes and per-appointment rows " +
    "are sessions; po_ IDs, arrival dates and weekly lump sums are payouts), ask if unclear, and always dry-run first. " +
    "Never send client or patient names to any tool.",
});

const authed = withMcpAuth(handler, verifySupabaseToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authed as GET, authed as POST, authed as DELETE };
