import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { AI_CONFIG } from "@/lib/ai/config";
import type { Json } from "@/lib/database.types";
import { decryptMessages, encryptMessages } from "@/lib/transcript-crypto";

export interface ThreadSummary {
  id: string;
  title: string | null;
  updated_at: string;
}

export async function listThreads(supabase: SupabaseClient, userId: string): Promise<ThreadSummary[]> {
  const { data } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getThreadMessages(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<UIMessage[] | null> {
  const { data } = await supabase
    .from("chat_sessions")
    .select("messages")
    .eq("id", id)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (!data) return null;
  return decryptMessages(data.messages);
}

function firstUserText(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  return (first?.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
}

async function generateTitle(messages: UIMessage[]): Promise<string> {
  const text = firstUserText(messages);
  const fallback = text.slice(0, 60) || "New conversation";
  if (!text) return fallback;
  try {
    const { text: title } = await generateText({
      model: anthropic(AI_CONFIG.models.title),
      prompt: `Write a 2-5 word title for a conversation that starts with this message. Reply with the title only, no quotes or punctuation at the end.\n\n${text.slice(0, 500)}`,
      maxOutputTokens: 20,
    });
    return title.trim().replace(/^["']|["'.]$/g, "").slice(0, 80) || fallback;
  } catch (e) {
    console.error("Title generation failed:", e);
    return fallback;
  }
}

// Upserts the thread for this user. Titles are generated once, on first save.
export async function saveThread(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  messages: UIMessage[],
  recommendationId?: string
) {
  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("title")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const title = existing?.title ?? (await generateTitle(messages));
  const { error } = await supabase.from("chat_sessions").upsert({
    id,
    user_id: userId,
    messages: encryptMessages(messages) as unknown as Json,
    title,
    ...(recommendationId ? { recommendation_id: recommendationId } : {}),
  });
  if (error) console.error("Failed to save thread:", error);
}
