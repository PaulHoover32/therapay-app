import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { getValidLicenseCodes, updatePracticeInfo, US_STATES } from "@/lib/therapists";
import { fail, text, therapistFor } from "@/lib/mcp/helpers";
import { registerImportTools } from "@/lib/mcp/import-tools";

// No client data is stored: Therapay keeps no per-session records, and no tool that writes data
// takes free text.

const setupProfileInput = z.object({
  name: z.string().trim().min(1).max(120).optional().describe("The provider's own full name, as it should appear in Therapay"),
  license_type: z.string().optional().describe("License code, e.g. LCSW, LMFT, LPC, PsyD"),
  years_licensed: z.number().int().min(0).max(70).optional().describe("Years licensed"),
  states: z.array(z.string()).optional().describe("2-letter US states where the provider is licensed, e.g. ['CA', 'NY']"),
  specialties: z.string().max(300).optional().describe("Comma-separated clinical specialties, e.g. 'Trauma, Anxiety, CBT'"),
  practice_model: z.string().max(100).optional().describe("e.g. Solo private practice, Group practice, Headway, Alma, Grow"),
  avg_session_duration: z.number().int().min(15).max(180).optional().describe("Typical session length in minutes"),
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

  registerImportTools(server);
}
