import { tool } from "ai";
import { insertSessions } from "@/lib/sessions";
import { checkPayer, sessionFieldsSchema } from "./sessionSchemas";
import type { ToolContext } from "./context";

export const logSession = (ctx: ToolContext) =>
  tool({
    description:
      "Log one therapy session with the amount earned. The user sees a confirmation card and must approve before anything is saved. Ask for any missing field first; default the date to today and the state to their only licensed state.",
    inputSchema: sessionFieldsSchema,
    needsApproval: true,
    execute: async (session) => {
      if (!ctx.therapistId) return { success: false, error: "Therapist profile not found." };
      const payerError = checkPayer(session.payer, ctx.validPayerNames);
      if (payerError) return { success: false, error: payerError };
      const { data, error } = await insertSessions(ctx.supabase, ctx.therapistId, [session]);
      if (error) return { success: false, error: error.message };
      return { success: true, session: data?.[0] };
    },
  });
