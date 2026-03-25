import { streamText, tool, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTherapistContext, TherapistContext } from "@/lib/data";

export const runtime = "nodejs";

function buildSystemPrompt(ctx: TherapistContext): string {
  const goalBlock = ctx.existingGoal
    ? `Existing goal for ${ctx.existingGoal.goal_year}: $${ctx.existingGoal.annual_income_target.toLocaleString()} annual target, ${ctx.existingGoal.target_weekly_sessions} sessions/week at $${ctx.existingGoal.target_avg_payout.toFixed(0)}/session average, optimization: ${ctx.existingGoal.optimization_preference}.`
    : "No existing goal set for this year.";

  return `You are the Therapay AI Clinical Business Consultant — a warm, direct financial coach for therapists. You help therapists understand their practice performance and set achievable financial goals.

## Current Therapist Context
- Name: ${ctx.name}
- YTD Revenue (${new Date().getFullYear()}): $${ctx.ytdRevenue.toLocaleString()}
- Avg weekly sessions (last 4 weeks): ${ctx.avgWeeklySessions.toFixed(1)}
- Avg payout per session (last 4 weeks): $${ctx.avgPayoutPerSession.toFixed(0)}
- Weeks remaining in ${new Date().getFullYear()}: ${ctx.weeksRemainingInYear}
- ${goalBlock}

## Instructions
When a user selects "Model scenarios and set goals":
1. Acknowledge where they are in the year and what their current pace projects to annually — be specific with numbers.
2. Ask for their target annual income.
3. Ask how many weeks they plan to work for the rest of the year (flag holidays/vacation).
4. Ask whether they prefer to grow income by seeing more clients, increasing their average payout (e.g. shifting to private pay), or a balance of both.
5. Based on their answers, calculate:
   - target_weekly_sessions = derived from income target and payout
   - target_avg_payout = derived from income target and session volume
6. Present a clear summary: "To hit $X this year you need Y sessions/week at $Z average. Here's what that means for your schedule."
7. Ask for confirmation, then call the saveGoals tool to persist.
8. Confirm saved with a brief encouraging message.

When a user asks "How is my practice performing?":
Analyze their YTD revenue, pace, session velocity, and payout against any existing goal. Be specific and direct.

When a user asks "What should I focus on this week?":
Give 1–3 concrete, actionable recommendations based on their current metrics.

Always be concise. Therapists are busy — no unnecessary filler.
Never provide tax, legal, or clinical advice.
AI outputs are advisory only and support therapist judgment.`;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const ctx = await getTherapistContext(supabase, user.id);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(ctx),
    messages: await convertToModelMessages(messages),
    tools: {
      saveGoals: tool({
        description:
          "Save the therapist's financial goals to the database after they have confirmed the plan.",
        inputSchema: z.object({
          annual_income_target: z.number().describe("Target annual income in dollars"),
          target_weeks_worked: z.number().int().describe("Number of weeks the therapist plans to work this year"),
          optimization_preference: z
            .enum(["volume", "payout", "balanced"])
            .describe("Whether to grow income via more sessions, higher payout, or both"),
          target_weekly_sessions: z.number().describe("Derived target sessions per week"),
          target_avg_payout: z.number().describe("Derived target average payout per session"),
          goal_year: z.number().int().describe("The calendar year this goal applies to"),
        }),
        execute: async (params) => {
          // Deactivate any existing active goals for this user + year
          await supabase
            .from("goals")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .eq("goal_year", params.goal_year)
            .eq("is_active", true);

          // Insert the new goal
          const { error } = await supabase.from("goals").insert({
            user_id: user.id,
            ...params,
            is_active: true,
          });

          if (error) {
            console.error("Failed to save goal:", error);
            return { success: false, error: error.message };
          }

          return { success: true };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
