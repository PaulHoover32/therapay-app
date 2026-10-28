import { z } from "zod";
import { SESSION_CODES } from "@/lib/sessions";

export const sessionFieldsSchema = z.object({
  session_datetime: z.string().describe("Session date as YYYY-MM-DD (or ISO 8601 datetime)"),
  amount: z.number().positive().max(10000).describe("Amount earned for the session, in dollars"),
  session_code: z
    .enum(SESSION_CODES)
    .describe("CPT code: 90837 individual 53+ min, 90834 individual 45 min, 90847 couples/family, 90853 group, 90791 intake"),
  state: z.string().length(2).describe("2-letter US state where the session took place"),
  payer: z.string().describe("Must exactly match a valid payer name from the system prompt"),
});

export function checkPayer(payer: string, valid: string[]): string | null {
  if (!valid.length || valid.includes(payer)) return null;
  return `Unknown payer "${payer}". Use one of: ${valid.join(", ")}`;
}
