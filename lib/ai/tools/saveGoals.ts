import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./context";

export const saveGoals = (ctx: ToolContext) =>
  tool({
    description:
      "Save the therapist's financial goal and the recommendation behind it. The user approves on a confirmation card before it's saved; present the plan first.",
    inputSchema: z.object({
      annual_income_target: z.number().positive().describe("Target annual income in dollars"),
      target_weekly_hours: z.number().positive().describe("Derived target clinical hours per week (sessions × avg_session_duration ÷ 60)"),
      target_avg_payout: z.number().positive().describe("Derived target average payout per session"),
      goal_year: z.number().int().describe("The calendar year this goal applies to"),
      summary: z.string().describe("One plain English sentence summarizing the recommendation"),
      reasoning: z.string().describe("The full breakdown and explanation presented to the therapist before confirmation"),
      ytd_revenue_at_time: z.number().describe("YTD revenue at the time of this recommendation"),
      avg_weekly_hours_at_time: z.number().describe("Avg weekly clinical hours (last 4 weeks) at the time of this recommendation"),
      avg_payout_at_time: z.number().describe("Avg payout per session (last 4 weeks) at the time of this recommendation"),
      weeks_remaining_at_input: z.number().int().describe("Weeks remaining in the year at the time of this recommendation"),
    }),
    needsApproval: true,
    execute: async (p) => {
      // One transaction: recommendation + goal swap + onboarding flag (see save_goal_recommendation)
      const { data, error } = await ctx.supabase.rpc("save_goal_recommendation", {
        p_goal_year: p.goal_year,
        p_annual_income_target: p.annual_income_target,
        p_target_weekly_hours: p.target_weekly_hours,
        p_target_avg_payout: p.target_avg_payout,
        p_summary: p.summary,
        p_reasoning: p.reasoning,
        p_ytd_revenue_at_time: p.ytd_revenue_at_time,
        p_avg_weekly_hours_at_time: p.avg_weekly_hours_at_time,
        p_avg_payout_at_time: p.avg_payout_at_time,
        p_weeks_remaining_at_input: p.weeks_remaining_at_input,
      });
      if (error) return { success: false, error: error.message };
      ctx.recommendationId = data as string;
      return { success: true, recommendationId: data };
    },
  });
