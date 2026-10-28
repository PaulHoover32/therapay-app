import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { AUTH_SERVER_URL } from "@/lib/mcp/auth";

// RFC 9728 metadata: tells MCP clients that Supabase Auth issues tokens for /api/mcp.
// Served at both the bare path and the path-suffixed form (/.well-known/oauth-protected-resource/api/mcp).
const handler = protectedResourceHandler({ authServerUrls: [AUTH_SERVER_URL] });

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
