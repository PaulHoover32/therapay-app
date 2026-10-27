import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./context";

export const updatePracticeInfo = (ctx: ToolContext) =>
  tool({
    description:
      "Update the therapist's practice profile. Only pass fields being changed. The user approves on a confirmation card.",
    inputSchema: z.object({
      specialties: z.string().optional().describe("Comma-separated list of specialties, e.g. 'Trauma, Anxiety, CBT'"),
      years_licensed: z.number().int().positive().optional().describe("Number of years the therapist has been licensed"),
      license_type: z.string().optional().describe("License type code — must be one of the valid codes listed in the system prompt (e.g. LCSW, LMFT, LPC)"),
      practice_model: z.string().optional().describe("Practice model, e.g. Solo private practice, Group practice, Agency"),
      states: z.array(z.string().length(2)).optional().describe("US state abbreviations where the therapist is licensed, e.g. ['CA', 'NY']"),
    }),
    needsApproval: true,
    execute: async (updates) => {
      const fields = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      if (!Object.keys(fields).length) return { success: false, error: "No changes provided." };
      const { error } = await ctx.supabase.from("therapists").update(fields).eq("user_id", ctx.user.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
  });
