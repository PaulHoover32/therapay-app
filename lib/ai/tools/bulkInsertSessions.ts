import { tool } from "ai";
import { z } from "zod";
import { insertSessions } from "@/lib/sessions";
import { checkPayer, sessionFieldsSchema } from "./sessionSchemas";
import type { ToolContext } from "./context";

export const bulkInsertSessions = (ctx: ToolContext) =>
  tool({
    description:
      "Batch insert historical therapy sessions. Present the parsed summary first; the user then approves on a confirmation card.",
    inputSchema: z.object({ sessions: z.array(sessionFieldsSchema).min(1).max(500) }),
    needsApproval: true,
    execute: async ({ sessions }) => {
      if (!ctx.therapistId) return { success: false, error: "Therapist profile not found." };
      const bad = sessions.map((s) => checkPayer(s.payer, ctx.validPayerNames)).find(Boolean);
      if (bad) return { success: false, error: bad };
      const { error } = await insertSessions(ctx.supabase, ctx.therapistId, sessions);
      if (error) return { success: false, error: error.message };
      return { success: true, insertedCount: sessions.length };
    },
  });
