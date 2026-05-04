"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { SquarePen } from "lucide-react";
import { Thread } from "@/components/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chatStore";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useViewStore, type MainViewType } from "@/lib/stores/viewStore";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: () => ({ sessionId: useChatStore.getState().currentSessionId }),
});

const GREETING =
  "Ask me about anything in your practice — your earnings, payer mix, session trends, goals, or how to grow.";

const GREETING_NEW_USER =
  "Welcome! I'm your Therapay assistant. I can help set up your practice profile — things like your license type, how you bill clients, and the states you practice in. Just start typing.";

export default function BottomPane({ isNewUser }: { isNewUser?: boolean }) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const conversationKey = useChatStore((s) => s.conversationKey);
  const newConversation = useChatStore((s) => s.newConversation);

  useEffect(() => {
    setReady(false);
    setInitialMessages(undefined);
    const sessionId = useChatStore.getState().currentSessionId;
    if (!sessionId) {
      setReady(true);
      return;
    }
    createSupabaseBrowserClient()
      .from("chat_sessions")
      .select("messages")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        if (data?.messages?.length) setInitialMessages(data.messages as UIMessage[]);
        setReady(true);
      });
  }, [conversationKey]);

  if (!ready) return null;

  return (
    <BottomPaneInner
      key={conversationKey}
      initialMessages={initialMessages}
      onNewConversation={newConversation}
      greeting={isNewUser ? GREETING_NEW_USER : GREETING}
    />
  );
}

function BottomPaneInner({
  initialMessages,
  onNewConversation,
  greeting,
}: {
  initialMessages?: UIMessage[];
  onNewConversation: () => void;
  greeting: string;
}) {
  const router = useRouter();
  const messagesRef = useRef<UIMessage[]>(initialMessages ?? []);
  const { setMainView, addNote } = useViewStore();

  const chatHelpers = useChat({
    transport,
    messages: initialMessages,
    onFinish: ({ message }) => {
      // Detect showView tool calls and update the view store
      let hasViewNote = false;
      for (const part of message.parts) {
        if (part.type === "tool-call") {
          const p = part as unknown as { toolName: string; args: Record<string, unknown> };
          if (p.toolName === "showView") {
            if (p.args.main) setMainView(p.args.main as MainViewType);
            if (p.args.note) {
              addNote(String(p.args.note));
              hasViewNote = true;
            }
          }
        }
      }
      // Always add a note from the assistant's text if showView didn't provide one
      if (!hasViewNote) {
        const text = message.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("");
        const firstLine = text.split("\n").find((l) => l.trim().length > 20)?.trim();
        const note = firstLine
          ? firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine
          : null;
        if (note) addNote(note);
      }
      router.refresh();
      const sessionId = useChatStore.getState().currentSessionId;
      if (!sessionId) return;
      createSupabaseBrowserClient()
        .from("chat_sessions")
        .update({ messages: messagesRef.current })
        .eq("id", sessionId)
        .then(() => {});
    },
  });

  const { messages, sendMessage } = chatHelpers;
  const runtime = useAISDKRuntime(chatHelpers);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    async function init() {
      if ((initialMessages?.length ?? 0) === 0) {
        await useChatStore.getState().createSession();
      }
      const { pendingStarter, clearPendingStarter } = useChatStore.getState();
      if (pendingStarter) {
        clearPendingStarter();
        sendMessage({ text: pendingStarter });
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      sendMessage({ text: `I'd like to import sessions from this file (${file.name}):\n\n${text}` });
    } catch {
      // binary file — ignore
    }
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <p className="text-sm font-semibold text-violet-400">Therapay Assistant</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onNewConversation}
            title="New conversation"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <Thread greeting={greeting} onFile={handleFile} fullWidth />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
