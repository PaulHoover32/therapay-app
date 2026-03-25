import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTherapistContext, TherapistContext } from "@/lib/data";

export const runtime = "nodejs";

function buildSystemPrompt(ctx: TherapistContext): string {
  const goalBlock = ctx.existingGoal
    ? `Existing goal for ${ctx.existingGoal.goal_year}: $${ctx.existingGoal.annual_income_target.toLocaleString()} annual target, ${ctx.existingGoal.target_weekly_sessions} sessions/week at $${ctx.existingGoal.target_avg_payout.toFixed(0)}/session average.`
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
7. Write your full reasoning clearly — this will be saved as your recommendation.
8. Ask for explicit confirmation before calling saveGoals. Wait for the user to say yes/confirm.
9. Only after confirmation, call saveGoals with:
   - summary: a single plain English sentence, e.g. "To hit $110k this year you need 22 sessions/week at $96 average payout."
   - reasoning: the full breakdown you presented before confirmation
   - ytd_revenue_at_time, avg_weekly_sessions_at_time, avg_payout_at_time, weeks_remaining_at_input: snapshot the context values above
10. After saving, send a brief encouraging confirmation. Include a markdown link so they can review: [View your goals in Planner](/planner)

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

  const { messages, sessionId } = await req.json();

  const ctx = await getTherapistContext(supabase, user.id);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(ctx),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      saveGoals: tool({
        description:
          "Save the therapist's financial goals and recommendation to the database after they have explicitly confirmed the plan.",
        inputSchema: z.object({
          annual_income_target: z.number().describe("Target annual income in dollars"),
          target_weekly_sessions: z.number().describe("Derived target sessions per week"),
          target_avg_payout: z.number().describe("Derived target average payout per session"),
          goal_year: z.number().int().describe("The calendar year this goal applies to"),
          summary: z.string().describe("One plain English sentence summarizing the recommendation, e.g. 'To hit $110k this year you need 22 sessions/week at $96 average payout.'"),
          reasoning: z.string().describe("The full breakdown and explanation presented to the therapist before confirmation"),
          ytd_revenue_at_time: z.number().describe("YTD revenue at the time of this recommendation"),
          avg_weekly_sessions_at_time: z.number().describe("Avg weekly sessions (last 4 weeks) at the time of this recommendation"),
          avg_payout_at_time: z.number().describe("Avg payout per session (last 4 weeks) at the time of this recommendation"),
          weeks_remaining_at_input: z.number().int().describe("Weeks remaining in the year at the time of this recommendation"),
        }),
        execute: async (params) => {
          const now = new Date().toISOString();

          // 1. Insert into recommendations (append-only)
          const { data: recommendation, error: recError } = await supabase
            .from("recommendations")
            .insert({
              user_id: user.id,
              goal_year: params.goal_year,
              annual_income_target: params.annual_income_target,
              target_weekly_sessions: params.target_weekly_sessions,
              target_avg_payout: params.target_avg_payout,
              summary: params.summary,
              reasoning: params.reasoning,
              ytd_revenue_at_time: params.ytd_revenue_at_time,
              avg_weekly_sessions_at_time: params.avg_weekly_sessions_at_time,
              avg_payout_at_time: params.avg_payout_at_time,
              weeks_remaining_at_input: params.weeks_remaining_at_input,
            })
            .select("id")
            .single();

          if (recError) {
            console.error("Failed to save recommendation:", recError);
            return { success: false, error: recError.message };
          }

          // 2. Deactivate existing active goal, insert new one
          await supabase
            .from("goals")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .eq("goal_year", params.goal_year)
            .eq("is_active", true);

          const { error: goalError } = await supabase.from("goals").insert({
            user_id: user.id,
            goal_year: params.goal_year,
            annual_income_target: params.annual_income_target,
            target_weekly_sessions: params.target_weekly_sessions,
            target_avg_payout: params.target_avg_payout,
            is_active: true,
            last_modified_by: "ai",
            last_modified_at: now,
          });

          if (goalError) {
            console.error("Failed to save goal:", goalError);
            return { success: false, error: goalError.message };
          }

          // 3. Link the chat session to this recommendation
          if (sessionId) {
            await supabase
              .from("chat_sessions")
              .update({ recommendation_id: recommendation.id })
              .eq("id", sessionId);
          }

          return { success: true, recommendationId: recommendation.id };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
