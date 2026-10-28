import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./context";

export const sendPasswordReset = (ctx: ToolContext) =>
  tool({
    description: "Email the therapist a password reset link. Never collect a password in chat. The user approves first.",
    inputSchema: z.object({}),
    needsApproval: true,
    execute: async () => {
      const { error } = await ctx.supabase.auth.resetPasswordForEmail(ctx.user.email!);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
  });
