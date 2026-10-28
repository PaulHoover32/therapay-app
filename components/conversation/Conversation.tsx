"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { usePanelStore } from "@/lib/stores/panel";
import { useThreadsStore } from "@/lib/stores/threads";
import type { PanelState } from "@/lib/panel-views";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { usePrivacyAllowlist } from "@/hooks/use-privacy-allowlist";
import { preload, redactText, useMlStatus } from "@/lib/voice/ml-client";
import Thread from "./Thread";
import Composer from "./Composer";
import VoiceControls from "./VoiceControls";
import VoiceStatus from "./VoiceStatus";
import { useVoice } from "@/hooks/use-voice";
import { CLICK_ONLY_TOOLS, isWriteTool, type WriteTool } from "@/lib/ai/write-tools";
import { ToolStateContext, type ToolCallState } from "./ToolStateContext";

const transport = new DefaultChatTransport({ api: "/api/chat" });

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  approval?: { id: string };
};

const YES = /^(yes|yeah|yep|yup|sure|ok(ay)?|confirm(ed)?|correct|do it|save( it)?|go ahead|sounds good|that'?s right)\b/i;
const NO = /^(no|nope|nah|cancel|stop|don'?t|wait|hold on)\b/i;

function toolParts(messages: UIMessage[]): ToolPart[] {
  return messages.flatMap((m) =>
    (m.parts as ToolPart[]).filter((p) => p.type.startsWith("tool-") && "toolCallId" in p)
  );
}

interface Props {
  id: string;
  initialMessages: UIMessage[];
  isNew?: boolean;
  firstName: string | null;
  isNewUser: boolean;
}

export default function Conversation({ id, initialMessages, isNew, firstName, isNewUser }: Props) {
  const show = usePanelStore((s) => s.show);
  const invalidate = usePanelStore((s) => s.invalidate);
  const bumpThreads = useThreadsStore((s) => s.bump);
  // Tool calls already in the loaded history shouldn't re-trigger panel changes
  const handled = useRef(new Set(toolParts(initialMessages).map((p) => p.toolCallId)));
  const inUrl = useRef(!isNew);

  const chat = useChat({
    id,
    messages: initialMessages,
    transport,
    // After the user answers a confirmation card, continue the turn so the tool runs
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    // Surfaces server messages such as the daily limit (429) instead of a generic error
    onError: (err) => toast.error(err.message || "Something went wrong."),
    onFinish: () => {
      if (!inUrl.current) {
        inUrl.current = true;
        window.history.replaceState(null, "", `/chat/${id}`);
      }
      // The server saves after the stream closes; give it a moment before refetching the list
      setTimeout(bumpThreads, 1500);
    },
  });
  const runtime = useAISDKRuntime(chat);
  const { messages, sendMessage, status, stop, addToolApprovalResponse } = chat;

  useEffect(() => {
    for (const part of toolParts(messages)) {
      if (part.state !== "output-available" || handled.current.has(part.toolCallId)) continue;
      handled.current.add(part.toolCallId);
      const name = part.type.slice("tool-".length);
      if (name === "showView") show(part.input as PanelState);
      if (isWriteTool(name)) invalidate();
    }
  }, [messages, show, invalidate]);

  const { name } = useWorkspace();
  const allow = usePrivacyAllowlist(name);
  const allowRef = useRef(allow);
  useEffect(() => {
    allowRef.current = allow;
  }, [allow]);
  useEffect(() => preload("ner"), []);
  const filterReady = useMlStatus((s) => s.ner === "ready");

  const toolState = useMemo(() => {
    const calls = new Map<string, ToolCallState>();
    for (const p of toolParts(messages)) {
      calls.set(p.toolCallId, {
        toolName: p.type.slice("tool-".length),
        state: p.state,
        input: p.input as Record<string, unknown> | undefined,
        output: p.output,
        approvalId: p.approval?.id,
      });
    }
    const respond = (id: string, approved: boolean) => addToolApprovalResponse({ id, approved });
    return { calls, respond };
  }, [messages, addToolApprovalResponse]);

  // A spoken (or typed) yes/no answers pending confirmation cards; anything else declines them
  // and goes through as a normal message. Deletes always need a click.
  const answerPending = useCallback(
    (text: string): boolean => {
      const pending = [...toolState.calls.values()].filter((c) => c.state === "approval-requested" && c.approvalId);
      if (!pending.length) return false;
      const yes = YES.test(text.trim());
      const no = NO.test(text.trim());
      for (const c of pending) {
        const clickOnly = CLICK_ONLY_TOOLS.includes(c.toolName as WriteTool);
        if (yes && clickOnly) {
          toast("Tap Delete on the card to confirm.");
          continue;
        }
        addToolApprovalResponse({ id: c.approvalId!, approved: yes });
      }
      return yes || no;
    },
    [toolState, addToolApprovalResponse]
  );

  // Every outgoing message is redacted on this device first; the server only ever sees placeholders
  const send = useCallback(
    async (text: string) => {
      if (answerPending(text)) return;
      const { text: safe, count } = await redactText(text, allowRef.current);
      if (count) {
        toast(`Removed ${count} name${count > 1 ? "s" : ""} before sending`, {
          description: "Client names never leave your device.",
        });
      }
      sendMessage({ text: safe });
    },
    [sendMessage, answerPending]
  );
  const busy = status === "submitted" || status === "streaming";

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const assistantText = (lastAssistant?.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("\n");
  const voice = useVoice({
    onUtterance: send,
    assistantText,
    assistantMessageId: lastAssistant?.id ?? null,
    isResponding: busy,
    stopResponse: stop,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolStateContext.Provider value={toolState}>
      <div className="flex h-full min-h-0 flex-col">
        <WorkspaceHeader />
        <Thread firstName={firstName} isNewUser={isNewUser} onStarter={(t) => filterReady && send(t)} />
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <VoiceStatus
            state={voice.state}
            mode={voice.mode}
            partial={voice.partial}
            asrProgress={voice.asrProgress}
            onInterrupt={voice.interrupt}
          />
          <Composer
            onSend={send}
            onStop={stop}
            busy={busy}
            ready={filterReady}
            voiceControls={
              voice.supported ? (
                <VoiceControls
                  state={voice.state}
                  mode={voice.mode}
                  disabled={!filterReady}
                  onPttStart={voice.startPtt}
                  onPttEnd={voice.endPtt}
                  onToggleHandsfree={voice.toggleHandsfree}
                  onHover={voice.prepare}
                />
              ) : null
            }
          />
        </div>
      </div>
      </ToolStateContext.Provider>
    </AssistantRuntimeProvider>
  );
}
