import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTherapistContext, TherapistContext } from "@/lib/data";

export const runtime = "nodejs";

function buildSystemPrompt(ctx: TherapistContext): string {
  const goalBlock = ctx.existingGoal
    ? `Existing goal for ${ctx.existingGoal.goal_year}: $${ctx.existingGoal.annual_income_target.toLocaleString()} annual target, ${ctx.existingGoal.target_weekly_hours.toFixed(1)} hrs/week at $${ctx.existingGoal.target_avg_payout.toFixed(0)}/session average.`
    : "No existing goal set for this year.";

  const mixBlock = ctx.payerMix.length > 0
    ? ctx.payerMix.map((p) => `${p.type}: ${p.pct}% of sessions, $${p.avgPayout} avg payout`).join(" | ")
    : "No session history yet.";

  const now = new Date();
  const isStale = ctx.effectiveYear < now.getFullYear();
  const staleNote = isStale
    ? `\n- Note: No sessions logged yet in ${now.getFullYear()}. All metrics above are from ${ctx.effectiveYear} (most recent data available). When discussing goals and projections, reference ${ctx.effectiveYear} as the baseline and acknowledge that ${now.getFullYear()} sessions haven't been entered yet.`
    : "";

  return `You are the Therapay AI Clinical Business Consultant — a warm, direct financial coach for therapists. You help therapists understand their practice performance and set achievable financial goals.

## Current Therapist Context
- Name: ${ctx.name}
- Avg session duration: ${ctx.avgSessionDuration} minutes
- Revenue (${ctx.effectiveYear}): $${ctx.ytdRevenue.toLocaleString()}
- Avg weekly hours (last 4 weeks of ${ctx.effectiveYear}): ${ctx.avgWeeklyHours.toFixed(1)} hrs/week
- Avg payout per session (last 4 weeks of ${ctx.effectiveYear}): $${ctx.avgPayoutPerSession.toFixed(0)}
- Weeks remaining in ${now.getFullYear()}: ${ctx.weeksRemainingInYear}
- Current payer mix: ${mixBlock}
- ${goalBlock}${staleNote}

## Instructions

### Goal Setting ("Model scenarios and set goals")
1. Acknowledge where they are in the year and what their current pace projects to annually — be specific with numbers.
2. Ask for their target annual income.
3. Ask how many weeks they plan to work for the rest of the year (flag holidays/vacation).
4. Ask whether they prefer to grow income by seeing more clients, increasing their average payout (e.g. shifting to private pay), or a balance of both.
5. Based on their answers, calculate:
   - How many sessions/week they need to hit their income target at the given payout
   - Convert to hours: sessions × avg_session_duration ÷ 60 = target_weekly_hours
   - target_avg_payout = derived from income target and session volume
6. Present the answer in both units: "To hit $X this year you need Y sessions/week (Z hrs/week) at $W average payout."
7. If they want a scaffolded ramp (they're behind pace or want to build gradually), call showScaffoldedPlan with their annual target to show monthly milestones.
8. Write your full reasoning clearly — this will be saved as your recommendation.
9. Ask for explicit confirmation before calling saveGoals. Wait for the user to say yes/confirm.
10. Only after confirmation, call saveGoals.
11. After saving, send a brief encouraging confirmation. Include a markdown link: [View your goals in Planner](/planner)

### Increasing Average Payout ("How can I increase my average payout?" or similar)
1. Call analyzePayerMix with the therapist's target average payout.
   - If they haven't stated a target, ask first: "What average payout per session are you aiming for?"
2. After the visualization renders, explain the mix shift required.
3. Recommend the intake strategy: only accept new clients from higher-paying categories (move toward self-pay if insurance avg falls short; add/prioritize better-paying insurance panels if the target is achievable within insurance).
4. Be specific: "You currently get $X from insurance. To hit $Y avg you'd need Z% of sessions to be self-pay."
5. Never recommend dropping existing clients — only shifting new intakes.

### Growing Caseload ("How do I grow my caseload?" or similar)
1. Call analyzeCurrentPayers to surface what payer types and panels they currently accept.
2. After the card renders, explain the growth levers: expanding insurance panels and adding EAP contracts are the two most direct paths.
3. Note there's no quick fix — panel credentialing takes 60–90 days; EAP onboarding is faster.
4. If they're already diversified, acknowledge that and shift to scheduling/marketing approaches instead.

### Practice Performance ("How is my practice performing?")
Analyze their YTD revenue, pace, hours velocity, and payout against any existing goal. Be specific and direct.

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
  const therapistId = ctx.therapistId;
  const avgSessionDuration = ctx.avgSessionDuration;

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(ctx),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
    tools: {
      saveGoals: tool({
        description:
          "Save the therapist's financial goals and recommendation to the database after they have explicitly confirmed the plan.",
        inputSchema: z.object({
          annual_income_target: z.number().describe("Target annual income in dollars"),
          target_weekly_hours: z.number().describe("Derived target clinical hours per week (sessions × avg_session_duration ÷ 60)"),
          target_avg_payout: z.number().describe("Derived target average payout per session"),
          goal_year: z.number().int().describe("The calendar year this goal applies to"),
          summary: z.string().describe("One plain English sentence summarizing the recommendation"),
          reasoning: z.string().describe("The full breakdown and explanation presented to the therapist before confirmation"),
          ytd_revenue_at_time: z.number().describe("YTD revenue at the time of this recommendation"),
          avg_weekly_hours_at_time: z.number().describe("Avg weekly clinical hours (last 4 weeks) at the time of this recommendation"),
          avg_payout_at_time: z.number().describe("Avg payout per session (last 4 weeks) at the time of this recommendation"),
          weeks_remaining_at_input: z.number().int().describe("Weeks remaining in the year at the time of this recommendation"),
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

      analyzePayerMix: tool({
        description:
          "Analyze the therapist's current payer mix and compute what mix shift is needed to hit a target average payout per session. Call this when the therapist wants to increase their average payout.",
        inputSchema: z.object({
          targetAvgPayout: z.number().describe("The therapist's target average payout per session in dollars"),
        }),
        execute: async ({ targetAvgPayout }) => {
          if (!therapistId) return { error: "No therapist profile found" };

          const [{ data: sessions }, { data: refPayers }] = await Promise.all([
            supabase
              .from("sessions")
              .select("amount, payer")
              .eq("therapist_id", therapistId),
            supabase
              .from("reference_payers")
              .select("name, payment_option")
              .eq("active", true),
          ]);

          if (!sessions?.length) return { error: "No session history found" };

          const payerMap = new Map<string, string>();
          (refPayers ?? []).forEach((p: { name: string; payment_option: string }) =>
            payerMap.set(p.name, p.payment_option)
          );

          // Group by payment_option type
          const byType: Record<string, { count: number; total: number }> = {};
          sessions.forEach((s: { amount: number; payer: string }) => {
            const type = payerMap.get(s.payer) ?? "insurance";
            if (!byType[type]) byType[type] = { count: 0, total: 0 };
            byType[type].count++;
            byType[type].total += s.amount;
          });

          const total = sessions.length;
          const currentMix = Object.entries(byType).map(([type, { count, total: rev }]) => ({
            type,
            count,
            pct: Math.round((count / total) * 100),
            avgPayout: Math.round(rev / count),
          })).sort((a, b) => b.count - a.count);

          // Compute current weighted average
          const currentAvg = Math.round(
            currentMix.reduce((sum, t) => sum + t.avgPayout * (t.pct / 100), 0)
          );

          // Find the highest-paying type the therapist has experience with
          const sorted = [...currentMix].sort((a, b) => b.avgPayout - a.avgPayout);
          const highestType = sorted[0];
          const lowestType = sorted[sorted.length - 1];

          // Recommend mix: if target is achievable via rebalancing toward high-paying types, compute the new %
          // Simple two-type model: solve x*highAvg + (1-x)*otherAvg = target
          let recommendedMix = currentMix.map((t) => ({ ...t }));
          let achievable = true;

          if (highestType.avgPayout >= targetAvgPayout && targetAvgPayout > currentAvg) {
            // Solve: x * highAvg + (1-x) * rest_avg = target
            const restAvg = currentMix
              .filter((t) => t.type !== highestType.type)
              .reduce((sum, t) => sum + t.avgPayout * t.count, 0) /
              Math.max(1, currentMix.filter((t) => t.type !== highestType.type).reduce((s, t) => s + t.count, 0));

            const neededHighPct = restAvg < highestType.avgPayout
              ? Math.ceil(((targetAvgPayout - restAvg) / (highestType.avgPayout - restAvg)) * 100)
              : 100;

            const clampedPct = Math.min(neededHighPct, 100);
            const remainingPct = 100 - clampedPct;

            recommendedMix = currentMix.map((t) => {
              if (t.type === highestType.type) return { ...t, pct: clampedPct };
              // Distribute remaining proportionally among other types
              const otherTotal = currentMix.filter((x) => x.type !== highestType.type).reduce((s, x) => s + x.pct, 0);
              return { ...t, pct: otherTotal > 0 ? Math.round((t.pct / otherTotal) * remainingPct) : 0 };
            });
          } else if (targetAvgPayout > highestType.avgPayout) {
            // Target exceeds even the best type — need to move toward self-pay even if not currently in use
            achievable = false;
            recommendedMix = [
              { type: "self-pay", count: 0, pct: 60, avgPayout: 150 },
              ...currentMix.map((t) => ({ ...t, pct: Math.round(t.pct * 0.4) })),
            ];
          }

          return {
            currentMix,
            recommendedMix,
            currentAvgPayout: currentAvg,
            targetAvgPayout,
            gap: targetAvgPayout - currentAvg,
            achievableWithCurrentTypes: achievable,
            highestPayingType: highestType.type,
            lowestPayingType: lowestType.type,
          };
        },
      }),

      analyzeCurrentPayers: tool({
        description:
          "Analyze the therapist's current payer diversity and surface caseload growth opportunities. Call this when the therapist wants to grow their number of clients or total session volume.",
        inputSchema: z.object({}),
        execute: async () => {
          if (!therapistId) return { error: "No therapist profile found" };

          const [{ data: sessions }, { data: refPayers }] = await Promise.all([
            supabase
              .from("sessions")
              .select("payer")
              .eq("therapist_id", therapistId),
            supabase
              .from("reference_payers")
              .select("name, payment_option")
              .eq("active", true),
          ]);

          // Distinct payers used by this therapist
          const usedPayers = new Set((sessions ?? []).map((s: { payer: string }) => s.payer).filter(Boolean));

          const payerMap = new Map<string, string>();
          (refPayers ?? []).forEach((p: { name: string; payment_option: string }) =>
            payerMap.set(p.name, p.payment_option)
          );

          const currentPayers = [...usedPayers].map((name) => ({
            name,
            type: payerMap.get(name) ?? "insurance",
          }));

          const currentTypes = [...new Set(currentPayers.map((p) => p.type))];

          // Growth suggestions based on what's missing
          const suggestions: { type: string; rationale: string; timeToValue: string }[] = [];

          if (!currentTypes.includes("eap")) {
            suggestions.push({
              type: "EAP (Employee Assistance Programs)",
              rationale: "EAP contracts (e.g., Lyra, Spring Health, ComPsych) provide a steady referral stream of employed clients. Sessions are typically capped at 6–8 but volume can be high.",
              timeToValue: "2–4 weeks to credential",
            });
          }

          if (currentPayers.filter((p) => p.type === "insurance").length < 3) {
            suggestions.push({
              type: "Additional insurance panels",
              rationale: "Expanding to 3–5 major panels (Aetna, BCBS, Cigna, UHC, Magellan) broadens your referral network significantly. Each panel adds a new patient pool.",
              timeToValue: "60–90 days to credential",
            });
          }

          if (!currentTypes.includes("self-pay")) {
            suggestions.push({
              type: "Private pay / self-pay",
              rationale: "Adding self-pay slots increases both your avg payout and flexibility. Even 20% self-pay can raise your overall avg significantly.",
              timeToValue: "Immediate — no credentialing required",
            });
          }

          if (suggestions.length === 0) {
            suggestions.push({
              type: "Online directories & referral networks",
              rationale: "You already have strong payer diversity. Consider Psychology Today, Zencare, or Headway to expand referrals within your existing panels.",
              timeToValue: "1–2 weeks to set up",
            });
          }

          return {
            currentPayers,
            currentTypes,
            totalUniquePayers: usedPayers.size,
            suggestions,
          };
        },
      }),

      showScaffoldedPlan: tool({
        description:
          "Generate a month-by-month scaffolded ramp plan toward an annual income target. Call this when a therapist's current pace won't hit their goal and they need to see how to get there incrementally.",
        inputSchema: z.object({
          annualTarget: z.number().describe("The therapist's annual income target in dollars"),
        }),
        execute: async ({ annualTarget }) => {
          if (!therapistId) return { error: "No therapist profile found" };

          const { data: sessions } = await supabase
            .from("sessions")
            .select("amount, session_datetime, session_duration")
            .eq("therapist_id", therapistId);

          const now = new Date();
          const currentMonth = now.getMonth(); // 0-indexed

          // Compute monthly revenue from session history
          const monthlyActual: Record<number, number> = {};
          (sessions ?? []).forEach((s: { amount: number; session_datetime: string }) => {
            const d = new Date(s.session_datetime);
            if (d.getFullYear() === now.getFullYear()) {
              const m = d.getMonth();
              monthlyActual[m] = (monthlyActual[m] ?? 0) + s.amount;
            }
          });

          // Trailing 3-month avg as "current pace" per month
          const recentMonths = [0, 1, 2].map((offset) => {
            const m = (currentMonth - 1 - offset + 12) % 12;
            return monthlyActual[m] ?? 0;
          }).filter((v) => v > 0);

          const currentMonthlyPace = recentMonths.length > 0
            ? recentMonths.reduce((s, v) => s + v, 0) / recentMonths.length
            : annualTarget / 12;

          const ytdRevenue = Object.values(monthlyActual).reduce((s, v) => s + v, 0);
          const currentAnnualPace = ytdRevenue + currentMonthlyPace * (12 - currentMonth);

          // Remaining revenue needed after this month's already-logged data
          const remainingTarget = annualTarget - ytdRevenue;
          const remainingMonths = Math.max(1, 12 - currentMonth);

          // Generate a smooth ramp: start at current pace, end at what's needed to hit target
          // If already on pace, flat line. If behind, ramp up.
          const neededMonthlyAvg = remainingTarget / remainingMonths;
          const stepUp = (neededMonthlyAvg - currentMonthlyPace) / Math.max(1, remainingMonths - 1);

          const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

          const milestones = MONTHS.map((month, i) => {
            const isActual = i < currentMonth;
            const actual = isActual ? (monthlyActual[i] ?? 0) : null;

            // Target ramp: past months stay at actual; future months ramp from current pace
            const monthsOut = i - currentMonth;
            const targetRevThisMonth = isActual
              ? (monthlyActual[i] ?? 0)
              : Math.round(currentMonthlyPace + stepUp * Math.max(0, monthsOut));

            // Cumulative
            const cumulativeTarget = MONTHS.slice(0, i + 1).reduce((sum, _, j) => {
              if (j < currentMonth) return sum + (monthlyActual[j] ?? 0);
              const out = j - currentMonth;
              return sum + Math.round(currentMonthlyPace + stepUp * Math.max(0, out));
            }, 0);

            const cumulativePace = Math.round(currentMonthlyPace * (i + 1));

            // Sessions needed this month (at current avg payout)
            const sessionsNeeded = ctx.avgPayoutPerSession > 0
              ? Math.ceil(targetRevThisMonth / ctx.avgPayoutPerSession)
              : 0;

            return {
              month,
              actual,
              targetRevThisMonth,
              cumulativeTarget: Math.min(cumulativeTarget, annualTarget),
              cumulativePace,
              sessionsNeeded,
            };
          });

          return {
            annualTarget,
            ytdRevenue,
            currentAnnualPace: Math.round(currentAnnualPace),
            currentMonthlyPace: Math.round(currentMonthlyPace),
            neededMonthlyAvg: Math.round(neededMonthlyAvg),
            gapToClose: Math.max(0, Math.round(annualTarget - currentAnnualPace)),
            avgSessionDuration,
            milestones,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
