import type { SupabaseClient } from "@supabase/supabase-js";
import type { UIMessage } from "ai";
import type { ToolLogEntry } from "@/lib/ai/tools/context";
import type { Json } from "@/lib/database.types";

// Denials arrive on the request (the user's response to a confirmation card), not via execute
export function deniedToolLogs(messages: UIMessage[]): ToolLogEntry[] {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant") return [];
  return (last.parts as { type: string; state?: string; input?: unknown; approval?: { approved?: boolean } }[])
    .filter((p) => p.type.startsWith("tool-") && p.state === "approval-responded" && p.approval?.approved === false)
    .map((p) => ({ tool_name: p.type.slice(5), status: "denied" as const, input: p.input, output: null, duration_ms: null }));
}

export async function writeToolLogs(supabase: SupabaseClient, userId: string, threadId: string, logs: ToolLogEntry[]) {
  if (!logs.length) return;
  const { error } = await supabase.from("tool_call_logs").insert(
    logs.map((l) => ({
      user_id: userId,
      thread_id: threadId,
      tool_name: l.tool_name,
      status: l.status,
      input: (l.input ?? null) as Json,
      output: (l.output ?? null) as Json,
      duration_ms: l.duration_ms,
    }))
  );
  if (error) console.error("Failed to write tool logs:", error);
}
