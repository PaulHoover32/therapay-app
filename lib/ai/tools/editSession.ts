import { tool } from "ai";
import { z } from "zod";
import { updateSession } from "@/lib/sessions";
import { checkPayer, sessionFieldsSchema } from "./sessionSchemas";
import type { ToolContext } from "./context";

export const editSession = (ctx: ToolContext) =>
  tool({
    description:
      "Change fields on an existing session. Find the session id with queryData first. The user must approve the change on a confirmation card.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Session id from queryData"),
      changes: sessionFieldsSchema.partial().describe("Only the fields being changed"),
    }),
    needsApproval: true,
    execute: async ({ id, changes }) => {
      if (!ctx.therapistId) return { success: false, error: "Therapist profile not found." };
      if (changes.payer) {
        const payerError = checkPayer(changes.payer, ctx.validPayerNames);
        if (payerError) return { success: false, error: payerError };
      }
      const { data, error } = await updateSession(ctx.supabase, ctx.therapistId, id, changes);
      if (error) return { success: false, error: error.message };
      return { success: true, session: data };
    },
  });
