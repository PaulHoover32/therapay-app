import { streamText, tool, stepCountIs, convertToModelMessages, smoothStream } from "ai";
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

  const fmt$ = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const dailyBlock = ctx.hasNoData ? "No session data yet" : [
    `Revenue/day: ${fmt$(ctx.revenuePerDay)} (prev 28d: ${fmt$(ctx.prevRevenuePerDay)})${ctx.targetRevenuePerDay ? ` — goal ${fmt$(ctx.targetRevenuePerDay)}/day` : ""}`,
    `Hours/day: ${ctx.hoursPerDay.toFixed(1)} hrs (prev 28d: ${ctx.prevHoursPerDay.toFixed(1)} hrs)${ctx.targetHoursPerDay ? ` — goal ${ctx.targetHoursPerDay.toFixed(1)} hrs/day` : ""}`,
    `Avg payout/session: ${fmt$(ctx.avgPayoutPerSession)}${ctx.existingGoal ? ` — goal ${fmt$(ctx.existingGoal.target_avg_payout)}/session` : ""}`,
    `Working days/week (inferred): ${ctx.effectiveDaysPerWeek.toFixed(1)}`,
  ].join("\n- ");

  const practiceBlock = [
    ctx.specialties ? `Specialties: ${ctx.specialties}` : "Specialties: not set",
    ctx.yearsLicensed ? `Years licensed: ${ctx.yearsLicensed}` : "Years licensed: not set",
    ctx.licenseType ? `License type: ${ctx.licenseType}` : "License type: not set",
    ctx.practiceModel ? `Practice model: ${ctx.practiceModel}` : "Practice model: not set",
    ctx.states?.length ? `Licensed states: ${ctx.states.join(", ")}` : "Licensed states: not set",
  ].join("\n- ");

  const licensureCodesBlock = ctx.validLicensureCodes.length
    ? ctx.validLicensureCodes.join(", ")
    : "LCSW, LICSW, LMFT, LPC, LPCC, LMHC, LCPC, PsyD, PhD, PMHNP, AMFT, ACSW, CADC, LADC";

  return `You are a financial advisor for independent (1099) therapists. Help them understand their practice performance, analyze their data, and set achievable financial goals.

## Therapist: ${ctx.name}
- ${ctx.hasNoData ? "No sessions logged yet" : `${ctx.effectiveYear} YTD revenue: $${ctx.ytdRevenue.toLocaleString()}`}
- Projected annual: ${projectedBlock}
- Prior year revenue: ${priorYearBlock}
- Weeks remaining in ${now.getFullYear()}: ${ctx.weeksRemainingInYear}
- ${goalBlock}
- Industry benchmarks: median gross $75k–$110k/yr; avg session $115–$145 (mixed payer); full-time ~20–25 hrs/week

## Practice Profile
- ${practiceBlock}

Use these fields to personalize advice — e.g. factor in specialty norms when discussing payer mix or session rates, and use years licensed to contextualize career stage.

Valid license type codes (use exactly as written): ${licensureCodesBlock}

## Dashboard Metrics (last 28 days vs. prior 28 days — matches cards exactly)
- ${dailyBlock}

These numbers are precomputed from the latest session data. Use them directly when discussing daily performance or goal progress — no need to re-query for these specific figures. Frame performance in daily terms (revenue/day, hours/day) rather than weekly unless the therapist asks for weekly.

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
- No tax, legal, or clinical advice. AI outputs are advisory only.

## Practice Info Setup Flow
When the therapist asks to set up or update their practice profile:
1. Use the \`web_search\` tool to search for "${ctx.name} therapist" to try to find their public profile (Psychology Today, TherapyDen, practice website, etc.)
2. Present what you found in a clear, friendly summary — specialties, years licensed, and any profile photo if discoverable
3. If you found a profile photo URL, offer to set it as their avatar and call \`setAvatarFromUrl\` if they agree (or if they say yes to setting up their full profile)
4. Ask them to confirm or correct the practice info values
5. Once confirmed, call \`updatePracticeInfo\` to save

If nothing useful is found via web search, just ask them directly.

## Account Management Flow
When the therapist asks to change their email or password:
- **Email change:** confirm the new address, then call \`updateAccount\`. Remind them a confirmation email goes to both their old and new address.
- **Password change:** never collect the password in chat. Instead, call \`sendPasswordReset\` to email them a secure reset link.`;
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
    experimental_transform: smoothStream({ delayInMs: 15, chunking: /[\s\S]/ }),
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

          // Mark onboarding complete on first goal save (no-op if already set)
          await supabase
            .from("therapists")
            .update({ onboarding_completed_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .is("onboarding_completed_at", null);

          return { success: true, recommendationId: recommendation.id };
        },
      }),

      updatePracticeInfo: tool({
        description:
          "Update the therapist's practice info after they have confirmed the values are correct. All fields are optional — only pass the ones being updated.",
        inputSchema: z.object({
          specialties: z
            .string()
            .optional()
            .describe("Comma-separated list of specialties, e.g. 'Trauma, Anxiety, CBT'"),
          years_licensed: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Number of years the therapist has been licensed"),
          license_type: z
            .string()
            .optional()
            .describe(`License type code — must be one of the valid codes listed in the system prompt (e.g. LCSW, LMFT, LPC)`),
          practice_model: z
            .string()
            .optional()
            .describe("Practice model, e.g. Solo private practice, Group practice, Agency"),
          states: z
            .array(z.string())
            .optional()
            .describe("List of US state abbreviations where the therapist is licensed, e.g. ['CA', 'NY']"),
        }),
        execute: async ({ specialties, years_licensed, license_type, practice_model, states }) => {
          const updates: Record<string, string | number | string[]> = {};
          if (specialties !== undefined) updates.specialties = specialties;
          if (years_licensed !== undefined) updates.years_licensed = years_licensed;
          if (license_type !== undefined) updates.license_type = license_type;
          if (practice_model !== undefined) updates.practice_model = practice_model;
          if (states !== undefined) updates.states = states;

          const { error } = await supabase
            .from("therapists")
            .update(updates)
            .eq("user_id", user.id);
          if (error) {
            console.error("Failed to update practice info:", error);
            return { success: false, error: error.message };
          }
          return { success: true };
        },
      }),

      updateAccount: tool({
        description:
          "Update the therapist's email address after they have explicitly confirmed the new email.",
        inputSchema: z.object({
          new_email: z.string().email().describe("New email address"),
        }),
        execute: async ({ new_email }) => {
          const { error } = await supabase.auth.updateUser({ email: new_email });
          if (error) {
            console.error("Failed to update email:", error);
            return { success: false, error: error.message };
          }
          return { success: true };
        },
      }),

      sendPasswordReset: tool({
        description:
          "Send a password reset email to the therapist's registered email address. Use this when they want to change their password — never collect the password in chat.",
        inputSchema: z.object({}),
        execute: async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email!);
          if (error) {
            console.error("Failed to send password reset:", error);
            return { success: false, error: error.message };
          }
          return { success: true };
        },
      }),

      setAvatarFromUrl: tool({
        description:
          "Download a profile photo from a URL and set it as the therapist's avatar. Use this when a photo is found during web search and the therapist agrees to use it.",
        inputSchema: z.object({
          image_url: z.string().url().describe("Direct URL of the profile photo to download"),
        }),
        execute: async ({ image_url }) => {
          try {
            const response = await fetch(image_url);
            if (!response.ok) return { success: false, error: "Could not fetch image" };

            const buffer = await response.arrayBuffer();
            const contentType = response.headers.get("content-type") ?? "image/jpeg";
            const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
            const path = `${user.id}/avatar.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(path, buffer, { upsert: true, contentType });

            if (uploadError) {
              console.error("Avatar upload failed:", uploadError);
              return { success: false, error: uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
            const urlWithBust = `${publicUrl}?t=${Date.now()}`;

            await supabase.from("therapists").update({ avatar_url: urlWithBust }).eq("user_id", user.id);

            return { success: true };
          } catch (e) {
            return { success: false, error: (e as Error).message };
          }
        },
      }),

      web_search: anthropic.tools.webSearch_20250305({
        maxUses: 5,
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
