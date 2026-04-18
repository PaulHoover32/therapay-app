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

  const projectedBlock = ctx.projectedAnnual
    ? `$${ctx.projectedAnnual.toLocaleString()} (based on current pace)`
    : isStale
      ? `N/A — no ${now.getFullYear()} sessions logged yet`
      : "N/A — no session data";

  const priorYearBlock = ctx.priorYearRevenue
    ? `$${ctx.priorYearRevenue.toLocaleString()} (${ctx.effectiveYear - 1})`
    : "N/A";

  return `You are the Therapay AI Clinical Business Consultant — a warm, direct financial coach for therapists. You help therapists understand their practice performance and set achievable financial goals.

## Current Therapist Context
- Name: ${ctx.name}
- Avg session duration: ${ctx.avgSessionDuration} minutes
- Has session history: ${ctx.hasNoData ? "No — no sessions logged yet" : "Yes"}
- YTD Revenue (${ctx.effectiveYear}): $${ctx.ytdRevenue.toLocaleString()}
- Projected annual (current pace): ${projectedBlock}
- Prior year revenue: ${priorYearBlock}
- Avg weekly hours (last 4 weeks): ${ctx.hasNoData ? "unknown" : `${ctx.avgWeeklyHours.toFixed(1)} hrs/week`}
- Avg payout per session (last 4 weeks): ${ctx.hasNoData ? "unknown" : `$${ctx.avgPayoutPerSession.toFixed(0)}`}
- Weeks remaining in ${now.getFullYear()}: ${ctx.weeksRemainingInYear}
- Current payer mix: ${mixBlock}
- ${goalBlock}
- Industry benchmarks (US private practice): median gross $75k–$110k/yr; avg session payout $115–$145 (mixed payer); full-time clinical ~20–25 hrs/week; year-1 range $40k–$70k while building caseload

## Instructions

### Goal Setting ("Model scenarios and set goals")

This conversation should feel warm and consultative — not a form. You're a coach helping them think through their year, not an intake bot collecting fields.

**Visual consistency rule:** Any time a scenario changes (user states a different target, asks "what if I charged more", asks to see a higher number), always re-call the appropriate tool to update the chart. Never describe a changed scenario in plain text only — the chart is the deliverable, and every scenario the user explores should be shown visually.

**Step 1 — Open with the annual planning philosophy (always, before anything else)**
In 1–2 sentences, explain why you plan on an annual basis: "I like to start with the full-year picture — once we have an annual target we can break it into monthly and weekly milestones, so you always know exactly where you stand and what needs to change." Keep it brief, then move straight into their situation.

**Step 2 — Orient them to their reality**

${ctx.hasNoData
  ? `This therapist has NO session history in Therapay. Ask ONE warm clarifying question before doing anything else: "Before we dig in — are you just starting to build your practice, or do you already have an established caseload and you're new to Therapay?" Wait for their answer before proceeding.

  IF they say brand new to practice:
  - Acknowledge warmly that building a caseload takes time — income follows a ramp, not a straight line from day one.
  - Explain the approach: "Rather than setting an aspirational income number, let's figure out what's realistically achievable this year based on how caseloads typically build — you might even exceed it."
  - Ask ONE question: "How many ongoing weekly clients do you have right now?" (0 is a perfectly normal answer.)
  - Briefly explain (1-2 sentences): therapists typically add 2–3 new ongoing clients per month, and a full caseload is around 20 clients/week.
  - Ask what their typical session rate is (or note you'll use the industry midpoint of $130 if they don't know yet).
  - Do NOT ask them to name an income target. Do NOT compute or state the achievable annual total yourself.
  - TOOL CALL REQUIRED: The moment you have both (a) their client count and (b) their session rate, your very next action must be to call showScaffoldedPlan with startingClients and avgPayoutOverride. Do not write any text before calling the tool. Do not describe the monthly breakdown, achievable total, or any numbers — the tool generates the chart and the model determines those values. Writing them yourself instead of calling the tool is incorrect behavior.
  - After the tool call completes, add one or two sentences of commentary on what the chart shows, then note: "If referrals move faster than expected, you could exceed this."
  - Use the tool's returned annualTarget (the achievable total) as annual_income_target when calling saveGoals.

  IF they say established but new to Therapay:
  - Ask: "Since you haven't logged sessions yet, tell me about your current caseload — roughly how many sessions a week and what's your typical rate?"
  - Use their self-reported numbers as the data anchor, then continue as below.`

  : ctx.projectedAnnual !== null
  ? `This therapist has active session history with a projected annual of $${ctx.projectedAnnual.toLocaleString()}. DO NOT ask the new-vs-established question — go straight to their data.
  - Lead with: "At your current pace, you're on track for about $${ctx.projectedAnnual.toLocaleString()} this year."
  ${ctx.priorYearRevenue ? `- Add: "Last year you brought in $${ctx.priorYearRevenue.toLocaleString()}."` : ""}
  - Add: "For reference, the US private practice median is around $85k–$110k."
  - Ask: "Are you happy maintaining this trajectory, or do you want to set a more ambitious target?"`

  : `This therapist has session history from ${ctx.effectiveYear} ($${ctx.ytdRevenue.toLocaleString()} in revenue) but hasn't logged any ${now.getFullYear()} sessions yet. DO NOT ask the new-vs-established question.
  - Acknowledge they're starting a new year: "You haven't logged any ${now.getFullYear()} sessions yet, so let's use your ${ctx.effectiveYear} numbers as our baseline."
  - Lead with: "Last year you brought in $${ctx.ytdRevenue.toLocaleString()}. If you maintained that pace in ${now.getFullYear()}, you'd land in a similar range."
  ${ctx.priorYearRevenue ? `- You can also reference prior year context if relevant.` : ""}
  - Add: "For reference, the US private practice median is around $85k–$110k."
  - Ask: "Are you looking to maintain last year's pace, or would you like to set a higher target for ${now.getFullYear()}?"`
}

**Step 3 — Land on a target (conversationally)**
Once they indicate a direction or share a number, reflect it back: "So we're planning toward $X for ${now.getFullYear()} — does that feel right?" Confirm before doing any math.

**Step 4 — Derive the weekly math. Never ask about weeks.**
Calculate internally — do not ask how many weeks they plan to work:
- sessions_per_year = annual_target / avg_payout_per_session
- sessions_per_week = sessions_per_year / 52
- target_weekly_hours = sessions_per_week × avg_session_duration / 60

For C1/C2 users with no session data, use their self-reported rate. If none, use the industry midpoint ($130/session) and say so explicitly.

Present the result as an insight, not an answer to a question: "To hit $X at $Y/session, you'd need about Z sessions/week — roughly W hours of clinical time. [Compare to their current hours if known, or note it's a reasonable starting point if not.]"

**Step 5 — One qualitative question**
- For C1 (new to practice, after showScaffoldedPlan has rendered): Ask "Does that feel like the right target for the year, or do you want to aim higher?" — not the levers question. Their only lever right now is filling a caseload, so asking about payout vs volume is premature.
  - If they're happy with the achievable estimate: proceed to save.
  - If they want to aim higher and state a specific number: IMMEDIATELY re-call showScaffoldedPlan with startingClients, avgPayoutOverride, AND annualTarget set to their stated number — keep new-practice mode. Do NOT omit startingClients. The tool will show the aspirational goal as the target curve and the realistic ramp as the pace line. After the chart re-renders, briefly note in text what faster-than-typical caseload growth would look like to reach their stated number. Use their stated number as annual_income_target when saving.
  - Any time the user changes a number or asks "what if I charged more / started with more clients": re-call showScaffoldedPlan with updated parameters. Never describe a changed scenario in text only — always update the chart.
- For all others (established therapist): "To get there, you can focus on seeing more clients, raising your average payout, or a mix of both. Which direction feels right?" This informs the recommendation reasoning.
Do not ask about weeks or any other numeric input.

**Step 6 — Scaffolded ramp plan**
- C1 (new to practice): Always call showScaffoldedPlan. Frame it as a caseload ramp showing how income builds month by month.
- All others: Offer it if their target is more than 10% above their projected annual. "Want me to map out a month-by-month ramp to get there?"

**Step 7 — Present and confirm**
Summarize the full plan clearly — target, weekly sessions/hours, the lever they chose, and (if applicable) the ramp. Then: "Want me to save this as your ${now.getFullYear()} goal?"

**Step 8 — Save after explicit confirmation**
Only call saveGoals after they say yes/confirm.

**Step 9 — Post-save**
Brief encouraging note. Include a markdown link: [View your goals in Planner](/planner)

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
          "Generate a month-by-month scaffolded ramp plan. For established therapists, pass annualTarget to ramp toward a goal. For brand-new therapists building from zero, pass startingClients and avgPayoutOverride instead — the tool will model realistic caseload growth and derive the achievable annual total.",
        inputSchema: z.object({
          annualTarget: z.number().optional().describe("For established therapists: the income target in dollars. Omit when using startingClients mode."),
          startingClients: z.number().int().optional().describe("For new-to-practice therapists: how many ongoing weekly clients they have right now (0 if none). When provided, the tool models caseload growth at 2 new clients/month toward a full caseload of 20, and derives the achievable annual income from that trajectory."),
          avgPayoutOverride: z.number().optional().describe("For new-to-practice therapists: their self-reported or assumed avg payout per session (use industry midpoint $130 if unknown)."),
        }),
        execute: async ({ annualTarget, startingClients, avgPayoutOverride }) => {
          if (!therapistId) return { error: "No therapist profile found" };

          const { data: sessions } = await supabase
            .from("sessions")
            .select("amount, session_datetime, session_duration")
            .eq("therapist_id", therapistId);

          const now = new Date();
          const currentMonth = now.getMonth(); // 0-indexed

          // ── New-practice caseload-growth mode ────────────────────────────────
          if (startingClients !== undefined) {
            const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const avgPayout = avgPayoutOverride ?? ctx.avgPayoutPerSession ?? 130;
            const FULL_CASELOAD = 20;
            const WEEKS_PER_MONTH = 4.33;

            const computeTotal = (rate: number) =>
              MONTHS.reduce((sum, _, i) => {
                if (i < currentMonth) return sum;
                const clients = Math.min(startingClients + rate * (i - currentMonth + 1), FULL_CASELOAD);
                return sum + clients * WEEKS_PER_MONTH * avgPayout;
              }, 0);

            // If user specified a target, solve for the add rate that achieves it
            let addRate = 2;
            if (annualTarget && annualTarget > computeTotal(2)) {
              let lo = 2, hi = 20;
              for (let iter = 0; iter < 60; iter++) {
                const mid = (lo + hi) / 2;
                computeTotal(mid) < annualTarget ? (lo = mid) : (hi = mid);
                if (hi - lo < 0.05) break;
              }
              addRate = Math.round((lo + hi) / 2 * 10) / 10; // round to 1 decimal
            }

            let cumulative = 0;
            const milestones = MONTHS.map((month, i) => {
              const monthsFromNow = i - currentMonth;
              const isActual = i < currentMonth;
              if (isActual) return { month, actual: null, targetRevThisMonth: 0, cumulativeTarget: 0, cumulativePace: 0, sessionsNeeded: 0, clientsThisMonth: 0 };

              const clients = Math.min(startingClients + addRate * (monthsFromNow + 1), FULL_CASELOAD);
              const revenue = Math.round(clients * WEEKS_PER_MONTH * avgPayout);
              cumulative += revenue;

              return {
                month,
                actual: null,
                targetRevThisMonth: revenue,
                cumulativeTarget: cumulative,
                cumulativePace: 0,
                sessionsNeeded: Math.round(clients * WEEKS_PER_MONTH),
                clientsThisMonth: Math.round(clients),
              };
            });

            const achievableAnnual = Math.round(milestones.reduce((s, m) => s + m.targetRevThisMonth, 0));
            const fullCaseloadMonthlyRevenue = Math.round(FULL_CASELOAD * WEEKS_PER_MONTH * avgPayout);
            const monthsToFullCaseload = Math.max(0, Math.ceil((FULL_CASELOAD - startingClients) / addRate));

            return {
              mode: "new-practice",
              annualTarget: achievableAnnual,
              addRatePerMonth: addRate,
              ytdRevenue: 0,
              currentAnnualPace: 0,
              currentMonthlyPace: 0,
              neededMonthlyAvg: 0,
              gapToClose: 0,
              avgSessionDuration,
              fullCaseloadMonthlyRevenue,
              monthsToFullCaseload,
              startingClients,
              milestones,
            };
          }

          // ── Established-therapist ramp mode ──────────────────────────────────
          const target = annualTarget ?? 0;

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
            : target / 12;

          const ytdRevenue = Object.values(monthlyActual).reduce((s, v) => s + v, 0);
          const currentAnnualPace = ytdRevenue + currentMonthlyPace * (12 - currentMonth);

          const remainingTarget = target - ytdRevenue;
          const remainingMonths = Math.max(1, 12 - currentMonth);
          const neededMonthlyAvg = remainingTarget / remainingMonths;
          const stepUp = (neededMonthlyAvg - currentMonthlyPace) / Math.max(1, remainingMonths - 1);

          const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

          const milestones = MONTHS.map((month, i) => {
            const isActual = i < currentMonth;
            const actual = isActual ? (monthlyActual[i] ?? 0) : null;
            const monthsOut = i - currentMonth;
            const targetRevThisMonth = isActual
              ? (monthlyActual[i] ?? 0)
              : Math.round(currentMonthlyPace + stepUp * Math.max(0, monthsOut));

            const cumulativeTarget = MONTHS.slice(0, i + 1).reduce((sum, _, j) => {
              if (j < currentMonth) return sum + (monthlyActual[j] ?? 0);
              const out = j - currentMonth;
              return sum + Math.round(currentMonthlyPace + stepUp * Math.max(0, out));
            }, 0);

            const cumulativePace = Math.round(currentMonthlyPace * (i + 1));
            const sessionsNeeded = ctx.avgPayoutPerSession > 0
              ? Math.ceil(targetRevThisMonth / ctx.avgPayoutPerSession)
              : 0;

            return {
              month,
              actual,
              targetRevThisMonth,
              cumulativeTarget: Math.min(cumulativeTarget, target),
              cumulativePace,
              sessionsNeeded,
              clientsThisMonth: undefined,
            };
          });

          return {
            mode: "established",
            annualTarget: target,
            ytdRevenue,
            currentAnnualPace: Math.round(currentAnnualPace),
            currentMonthlyPace: Math.round(currentMonthlyPace),
            neededMonthlyAvg: Math.round(neededMonthlyAvg),
            gapToClose: Math.max(0, Math.round(target - currentAnnualPace)),
            avgSessionDuration,
            milestones,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
