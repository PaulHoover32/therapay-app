import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "@/lib/ai/config";

type Kind = "chat" | "tts";

function startOfUtcDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  event: { kind: Kind; model?: string; inputTokens?: number; outputTokens?: number; characters?: number }
) {
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    kind: event.kind,
    model: event.model ?? null,
    input_tokens: event.inputTokens ?? 0,
    output_tokens: event.outputTokens ?? 0,
    characters: event.characters ?? 0,
  });
  if (error) console.error("Failed to record usage:", error);
}

export interface DailyUsage {
  chatTurns: number;
  inputTokens: number;
  outputTokens: number;
  ttsCharacters: number;
}

export async function getDailyUsage(supabase: SupabaseClient, userId: string): Promise<DailyUsage> {
  const { data } = await supabase
    .from("usage_events")
    .select("kind, input_tokens, output_tokens, characters")
    .eq("user_id", userId)
    .gte("created_at", startOfUtcDay());
  const rows = data ?? [];
  return {
    chatTurns: rows.filter((r) => r.kind === "chat").length,
    inputTokens: rows.reduce((n, r) => n + r.input_tokens, 0),
    outputTokens: rows.reduce((n, r) => n + r.output_tokens, 0),
    ttsCharacters: rows.filter((r) => r.kind === "tts").reduce((n, r) => n + r.characters, 0),
  };
}

// Returns a user-facing message when a daily cap is reached, otherwise null
export async function checkCap(supabase: SupabaseClient, userId: string, kind: Kind, adding = 0): Promise<string | null> {
  const usage = await getDailyUsage(supabase, userId);
  const { chatTurnsPerDay, ttsCharactersPerDay } = AI_CONFIG.limits;
  if (kind === "chat" && usage.chatTurns >= chatTurnsPerDay) {
    return `You've reached today's limit of ${chatTurnsPerDay} messages. It resets at midnight UTC.`;
  }
  if (kind === "tts" && usage.ttsCharacters + adding > ttsCharactersPerDay) {
    return "You've reached today's spoken-reply limit. Replies will show as text until midnight UTC.";
  }
  return null;
}
