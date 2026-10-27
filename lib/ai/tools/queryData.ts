import { tool } from "ai";
import { z } from "zod";
import { runSelect } from "@/lib/analytics/queries";
import type { ToolContext } from "./context";

export const queryData = (ctx: ToolContext) =>
  tool({
    description: "Run a SQL SELECT query against the therapist's sessions, goals, and recommendations data.",
    inputSchema: z.object({
      sql: z.string().describe("A SQL SELECT query"),
      explanation: z.string().describe("One sentence describing what this query computes"),
    }),
    execute: async ({ sql }) => {
      try {
        const { rows, truncated } = runSelect(await ctx.getDb(), sql);
        return { columns: rows[0] ? Object.keys(rows[0]) : [], rows, truncated };
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
  });
