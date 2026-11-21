import type { AuthInfo } from "@modelcontextprotocol/server";
import { mcpUser } from "@/lib/mcp/auth";
import { getTherapistByUser } from "@/lib/therapists";

export type Ctx = { http?: { authInfo?: AuthInfo } };

export const DATE = /^\d{4}-\d{2}-\d{2}/;

export const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
export const fail = (message: string) => ({ ...text(message), isError: true });

export async function therapistFor(ctx: Ctx) {
  const user = mcpUser(ctx.http?.authInfo);
  const { data: therapist, error } = await getTherapistByUser(user.supabase, user.userId);
  if (error) throw new Error(error.message);
  if (!therapist) throw new Error("No Therapay profile found for this account.");
  return { ...user, therapist };
}

export function dayAfter(date: string) {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
