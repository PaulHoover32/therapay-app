import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTherapistContext, TherapistContext } from "@/lib/data";
import { buildUserDb } from "@/lib/userDb";

export const runtime = "nodejs";

function buildSystemPrompt(ctx: TherapistContext): string {
  const now = new Date();

  const goalBlock = ctx.existingGoal
    ? `Active goal (${ctx.existingGoal.goal_year}): $${ctx.existingGoal.annual_income_target.toLocaleString()} annual target, ${ctx.existingGoal.target_weekly_hours.toFixed(1)} hrs/week at $${ctx.existingGoal.target_avg_payout.toFixed(0)}/session.`
    : "No active goal set for this year.";

  const projectedBlock = ctx.projectedAnnual
    ? `$${ctx.projectedAnnual.toLocaleString()} (current pace)`
    : ctx.effectiveYear < now.getFullYear()
      ? `N/A — no ${now.getFullYear()} sessions yet`
      : "N/A — no session data";

  const priorYearBlock = ctx.priorYearRevenue
    ? `$${ctx.priorYearRevenue.toLocaleString()} (${ctx.effectiveYear - 1})`
    : "N/A";

  return `You are a financial advisor for independent (1099) therapists. Help them understand their practice performance, analyze their data, and set achievable financial goals.

## Therapist: ${ctx.name}
- ${ctx.hasNoData ? "No sessions logged yet" : `${ctx.effectiveYear} YTD revenue: $${ctx.ytdRevenue.toLocaleString()}`}
- Projected annual: ${projectedBlock}
- Prior year revenue: ${priorYearBlock}
- Avg weekly hours (last 4 weeks): ${ctx.hasNoData ? "N/A" : `${ctx.avgWeeklyHours.toFixed(1)} hrs`}
- Avg payout per session (last 4 weeks): ${ctx.hasNoData ? "N/A" : `$${ctx.avgPayoutPerSession.toFixed(0)}`}
- Weeks remaining in ${now.getFullYear()}: ${ctx.weeksRemainingInYear}
- ${goalBlock}
- Industry benchmarks: median gross $75k–$110k/yr; avg session $115–$145 (mixed payer); full-time ~20–25 hrs/week

## Your Data
Use the \`queryData\` tool to run SQL SELECT queries against these tables:

### sessions
id TEXT, session_datetime TEXT (ISO 8601), amount REAL (dollars), session_duration INTEGER (minutes), payer TEXT (payer name), payer_type TEXT ('insurance'|'self-pay'|'eap'|'sliding-scale'), session_code TEXT, state TEXT

### goals
id TEXT, goal_year INTEGER, annual_income_target REAL, target_weekly_hours REAL, target_avg_payout REAL, is_active INTEGER (1=active 0=inactive), last_modified_at TEXT, last_modified_by TEXT ('user'|'ai'), optimization_preference TEXT

### recommendations
id TEXT, created_at TEXT, annual_income_target REAL, target_weekly_hours REAL, target_avg_payout REAL, summary TEXT, ytd_revenue_at_time REAL, avg_weekly_hours_at_time REAL, avg_payout_at_time REAL, weeks_remaining_at_input INTEGER

## Instructions
- Analyze freely. Use \`queryData\` whenever a question requires data you don't already have from the summary above.
- Always cite specific numbers from query results in your responses.
- To set a goal: discuss options, get explicit confirmation, then call \`saveGoals\`.
- Be concise — therapists are busy.
- No tax, legal, or clinical advice. AI outputs are advisory only.`;
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
  const db = await buildUserDb(supabase, ctx.therapistId ?? "", user.id);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(ctx),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(15),
    tools: {
      queryData: tool({
        description:
          "Run a SQL SELECT query against the therapist's sessions, goals, and recommendations data.",
        inputSchema: z.object({
          sql: z.string().describe("A SQL SELECT query"),
          explanation: z
            .string()
            .describe("One sentence describing what this query computes"),
        }),
        execute: async ({ sql }) => {
          if (!sql.trim().toUpperCase().startsWith("SELECT")) {
            return { error: "Only SELECT queries are allowed." };
          }
          try {
            const results = db.exec(sql);
            if (!results.length) return { columns: [], rows: [] };
            const { columns, values } = results[0];
            const rows = values
              .slice(0, 200)
              .map((row) =>
                Object.fromEntries(columns.map((col, i) => [col, row[i]]))
              );
            return { columns, rows, truncated: values.length > 200 };
          } catch (e) {
            return { error: (e as Error).message };
          }
        },
      }),

      saveGoals: tool({
        description:
          "Save the therapist's financial goals and recommendation to the database after they have explicitly confirmed the plan.",
        inputSchema: z.object({
          annual_income_target: z
            .number()
            .describe("Target annual income in dollars"),
          target_weekly_hours: z
            .number()
            .describe(
              "Derived target clinical hours per week (sessions × avg_session_duration ÷ 60)"
            ),
          target_avg_payout: z
            .number()
            .describe("Derived target average payout per session"),
          goal_year: z
            .number()
            .int()
            .describe("The calendar year this goal applies to"),
          summary: z
            .string()
            .describe(
              "One plain English sentence summarizing the recommendation"
            ),
          reasoning: z
            .string()
            .describe(
              "The full breakdown and explanation presented to the therapist before confirmation"
            ),
          ytd_revenue_at_time: z
            .number()
            .describe("YTD revenue at the time of this recommendation"),
          avg_weekly_hours_at_time: z
            .number()
            .describe(
              "Avg weekly clinical hours (last 4 weeks) at the time of this recommendation"
            ),
          avg_payout_at_time: z
            .number()
            .describe(
              "Avg payout per session (last 4 weeks) at the time of this recommendation"
            ),
          weeks_remaining_at_input: z
            .number()
            .int()
            .describe(
              "Weeks remaining in the year at the time of this recommendation"
            ),
        }),
        execute: async (params) => {
          const now = new Date().toISOString();

          const { data: recommendation, error: recError } = await supabase
            .from("recommendations")
            .insert({
              user_id: user.id,
              goal_year: params.goal_year,
              annual_income_target: params.annual_income_target,
              target_weekly_hours: params.target_weekly_hours,
              target_avg_payout: params.target_avg_payout,
              summary: params.summary,
              reasoning: params.reasoning,
              ytd_revenue_at_time: params.ytd_revenue_at_time,
              avg_weekly_hours_at_time: params.avg_weekly_hours_at_time,
              avg_payout_at_time: params.avg_payout_at_time,
              weeks_remaining_at_input: params.weeks_remaining_at_input,
            })
            .select("id")
            .single();

          if (recError) {
            console.error("Failed to save recommendation:", recError);
            return { success: false, error: recError.message };
          }

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
            target_weekly_hours: params.target_weekly_hours,
            target_avg_payout: params.target_avg_payout,
            is_active: true,
            last_modified_by: "ai",
            last_modified_at: now,
          });

          if (goalError) {
            console.error("Failed to save goal:", goalError);
            return { success: false, error: goalError.message };
          }

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
