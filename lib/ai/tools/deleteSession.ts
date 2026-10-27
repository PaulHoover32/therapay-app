import { tool } from "ai";
import { z } from "zod";
import { deleteSession as removeSession } from "@/lib/sessions";
import type { ToolContext } from "./context";

export const deleteSession = (ctx: ToolContext) =>
  tool({
    description:
      "Delete a session. Find the id with queryData and describe the session (date, payer, amount) in `summary`. The user must click to confirm; a spoken yes is not enough.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Session id from queryData"),
      summary: z.string().max(200).describe("Human description shown on the confirmation card, e.g. 'Mar 3 · Aetna · 90837 · $120'"),
    }),
    needsApproval: true,
    execute: async ({ id }) => {
      if (!ctx.therapistId) return { success: false, error: "Therapist profile not found." };
      const { error } = await removeSession(ctx.supabase, ctx.therapistId, id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
  });
