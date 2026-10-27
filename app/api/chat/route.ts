import { streamText, stepCountIs, convertToModelMessages, smoothStream, createIdGenerator, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTherapistContext } from "@/lib/data";
import { AI_CONFIG } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { buildTools } from "@/lib/ai/tools";
import { createToolContext } from "@/lib/ai/tools/context";
import { saveThread } from "@/lib/threads";
import { deniedToolLogs, writeToolLogs } from "@/lib/ai/tool-logs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const messages = body?.messages as UIMessage[] | undefined;
  // `id` comes from useChat; `sessionId` from the legacy chat pane
  const threadId: unknown = body?.id ?? body?.sessionId;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 400) {
    return new Response("Invalid request", { status: 400 });
  }
  const sessionId = typeof threadId === "string" && /^[0-9a-f-]{36}$/i.test(threadId) ? threadId : null;

  const ctx = await getTherapistContext(supabase, user.id);
  const toolCtx = createToolContext({
    supabase,
    user,
    therapistId: ctx.therapistId,
    threadId: sessionId,
    validPayerNames: ctx.validPayerNames,
  });

  const result = streamText({
    model: anthropic(AI_CONFIG.models.chat),
    system: buildSystemPrompt(ctx),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(AI_CONFIG.chat.maxSteps),
    experimental_transform: smoothStream({ delayInMs: 15, chunking: /[\s\S]/ }),
    tools: buildTools(toolCtx),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    onFinish: async ({ messages: finalMessages }) => {
      toolCtx.dispose();
      if (!sessionId) return;
      await saveThread(supabase, user.id, sessionId, finalMessages, toolCtx.recommendationId);
      await writeToolLogs(supabase, user.id, sessionId, [...toolCtx.logs, ...deniedToolLogs(messages)]);
    },
  });
}
