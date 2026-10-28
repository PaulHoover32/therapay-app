import { tool } from "ai";
import { z } from "zod";
import { runNamedQuery } from "@/lib/analytics/queries";
import type { ToolContext } from "./context";

// Same named queries the summary panel reads, so spoken numbers match the screen
export const getEarningsSummary = (ctx: ToolContext) =>
  tool({
    description:
      "Get the therapist's earnings snapshot: year-to-date revenue, last 28 days vs the 28 before, hours, average payout, and active goal. Use for 'how am I doing' questions. Matches the summary panel exactly.",
    inputSchema: z.object({}),
    execute: async () => {
      const db = await ctx.getDb();
      const [summary] = runNamedQuery(db, "summary");
      const recentWeeks = runNamedQuery(db, "weeklyRevenue", { weeks: 4 });
      return { summary, recentWeeks };
    },
  });
