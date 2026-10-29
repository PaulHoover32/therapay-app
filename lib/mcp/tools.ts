import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { insertSessions, listSessions, SESSION_CODES } from "@/lib/sessions";
import { getValidLicenseCodes, getValidPayerNames, updatePracticeInfo, US_STATES } from "@/lib/therapists";
import { getPlatforms } from "@/lib/payouts";
import { DATE, dayAfter, fail, text, therapistFor } from "@/lib/mcp/helpers";
import { registerImportTools } from "@/lib/mcp/import-tools";

// No client names are stored: sessions have no free-text fields, and payer/state are checked
// against fixed reference lists, so a name typed into one of them is rejected, not saved.

const LIST_LIMIT = 500;

const setupProfileInput = z.object({
  name: z.string().trim().min(1).max(120).optional().describe("The provider's own full name, as it should appear in Therapay"),
  license_type: z.string().optional().describe("License code, e.g. LCSW, LMFT, LPC, PsyD"),
  years_licensed: z.number().int().min(0).max(70).optional().describe("Years licensed"),
  states: z.array(z.string()).optional().describe("2-letter US states where the provider is licensed, e.g. ['CA', 'NY']"),
  specialties: z.string().max(300).optional().describe("Comma-separated clinical specialties, e.g. 'Trauma, Anxiety, CBT'"),
  practice_model: z.string().max(100).optional().describe("e.g. Solo private practice, Group practice, Headway, Alma, Grow"),
  avg_session_duration: z.number().int().min(15).max(180).optional().describe("Typical session length in minutes"),
});

const logSessionInput = z.object({
  session_date: z.string().regex(DATE).describe("Date of the session, YYYY-MM-DD (or a full ISO 8601 datetime)"),
  amount: z.number().positive().max(10000).describe("Dollars earned for this session"),
  session_code: z
    .enum(SESSION_CODES)
    .describe("CPT code: 90837 individual 53+ min, 90834 individual 45 min, 90847 couples/family, 90853 group, 90791 intake"),
  payer: z.string().describe("Insurance company or payment source, matching one of Therapay's payer names (e.g. Aetna, Self-Pay)"),
  state: z.string().length(2).describe("2-letter US state where the session took place"),
  platform: z.string().optional().describe("Platform the session was held through, if any (Grow Therapy, Headway, Alma…)"),
});

const listSessionsInput = z.object({
  start_date: z.string().regex(DATE).optional().describe("Only sessions on or after this date (YYYY-MM-DD)"),
  end_date: z.string().regex(DATE).optional().describe("Only sessions on or before this date (YYYY-MM-DD)"),
});

export function registerTherapayTools(server: McpServer) {
  server.registerTool(
    "setup_profile",
    {
      title: "Set up profile",
      description:
        "Create or update the therapist's Therapay profile: their own name, license, years licensed, licensed states, " +
        "specialties, practice model and typical session length. Only pass the fields being set or changed. " +
        "Use this during onboarding or whenever the provider says something about their practice changed.",
      inputSchema: setupProfileInput,
      annotations: { idempotentHint: true, destructiveHint: false },
    },
    async (input, ctx) => {
      try {
        const { supabase, userId, therapist } = await therapistFor(ctx);
        if (Object.values(input).every((v) => v === undefined)) return text({ saved: false, profile: therapist });
        const states = input.states?.map((s) => s.trim().toUpperCase());
        const badStates = states?.filter((s) => !(US_STATES as readonly string[]).includes(s)) ?? [];
        if (badStates.length) return fail(`Unknown state code(s): ${badStates.join(", ")}. Use 2-letter US codes.`);

        let license_type = input.license_type?.trim();
        if (license_type) {
          const codes = await getValidLicenseCodes(supabase);
          const match = codes.find((c) => c.toLowerCase() === license_type!.toLowerCase());
          if (codes.length && !match) return fail(`Unknown license type "${license_type}". Use one of: ${codes.join(", ")}`);
          license_type = match ?? license_type;
        }

        const { data, error } = await updatePracticeInfo(supabase, userId, { ...input, states, license_type });
        if (error) return fail(`Could not save the profile: ${error.message}`);
        return text({ saved: true, profile: data });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "log_session",
    {
      title: "Log a session",
      description:
        "Record one therapy session the provider held and the dollars earned from it. " +
        "NEVER include client or patient names, initials or any other identifying details about the client: " +
        "Therapay only stores the date, amount, CPT code, payer and state. If the user mentions a client's name, leave it out. " +
        "Ask for any missing field rather than guessing the payer or state. Log one call per session.",
      inputSchema: logSessionInput,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const state = input.state.toUpperCase();
        if (!(US_STATES as readonly string[]).includes(state)) return fail(`Unknown state "${input.state}". Use a 2-letter US code.`);

        const payers = await getValidPayerNames(supabase);
        const payer = payers.find((p) => p.toLowerCase() === input.payer.trim().toLowerCase());
        if (!payer) return fail(`Unknown payer "${input.payer}". Use one of: ${payers.join(", ")}`);

        let platform: string | null = null;
        if (input.platform) {
          const platforms = (await getPlatforms(supabase)).map((p) => p.name);
          platform = platforms.find((p) => p.toLowerCase() === input.platform!.trim().toLowerCase()) ?? null;
          if (!platform) return fail(`Unknown platform "${input.platform}". Use one of: ${platforms.join(", ")}`);
        }

        const { data, error } = await insertSessions(supabase, therapist.id, [
          { session_datetime: input.session_date, amount: input.amount, session_code: input.session_code, payer, state, platform },
        ]);
        if (error || !data?.[0]) return fail(`Could not log the session: ${error?.message ?? "no row returned"}`);
        return text({ logged: true, session: data[0], message: `Logged $${input.amount.toFixed(2)} from ${payer}.` });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "list_sessions",
    {
      title: "List sessions",
      description:
        `Return the provider's logged sessions (date, amount, CPT code, payer, state), newest first, up to ${LIST_LIMIT} rows. ` +
        "Optionally limit to a date range. Use it for what the provider earned (work performed): totals, trends, comparisons. " +
        "For cash actually received use list_payouts; for earned vs paid use get_reconciliation. " +
        "do the math from the rows. If the result says it was truncated, narrow the date range.",
      inputSchema: listSessionsInput,
      annotations: { readOnlyHint: true },
    },
    async (input, ctx) => {
      try {
        const { supabase, therapist } = await therapistFor(ctx);
        const { data, error } = await listSessions(supabase, therapist.id, {
          from: input.start_date?.slice(0, 10),
          to: input.end_date ? dayAfter(input.end_date) : undefined,
          limit: LIST_LIMIT + 1,
        });
        if (error) return fail(`Could not load sessions: ${error.message}`);
        const rows = data ?? [];
        return text({ count: Math.min(rows.length, LIST_LIMIT), truncated: rows.length > LIST_LIMIT, sessions: rows.slice(0, LIST_LIMIT) });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  registerImportTools(server);
}
