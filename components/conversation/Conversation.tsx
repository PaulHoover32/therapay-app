"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { usePanelStore } from "@/lib/stores/panel";
import { useThreadsStore } from "@/lib/stores/threads";
import type { PanelState } from "@/lib/panel-views";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import Thread from "./Thread";
import Composer from "./Composer";

const transport = new DefaultChatTransport({ api: "/api/chat" });

// Tools whose results change data a panel may be showing
const WRITE_TOOLS = new Set(["saveGoals", "updatePracticeInfo", "bulkInsertSessions"]);

type ToolPart = { type: string; toolCallId: string; state: string; input?: unknown };

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
  const { messages, sendMessage, status, stop } = chat;

  useEffect(() => {
    for (const part of toolParts(messages)) {
      if (part.state !== "output-available" || handled.current.has(part.toolCallId)) continue;
      handled.current.add(part.toolCallId);
      const name = part.type.slice("tool-".length);
      if (name === "showView") show(part.input as PanelState);
      if (WRITE_TOOLS.has(name)) invalidate();
    }
  }, [messages, show, invalidate]);

  const send = useCallback((text: string) => sendMessage({ text }), [sendMessage]);
  const busy = status === "submitted" || status === "streaming";

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full min-h-0 flex-col">
        <WorkspaceHeader />
        <Thread firstName={firstName} isNewUser={isNewUser} onStarter={send} />
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <Composer onSend={send} onStop={stop} busy={busy} />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
