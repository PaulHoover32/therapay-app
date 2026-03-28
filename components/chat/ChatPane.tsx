"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Send, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/store/chatStore";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { CONVERSATION_STARTERS } from "@/components/chat/starters";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import PayerMixViz from "@/components/chat/tools/PayerMixViz";
import CaseloadViz from "@/components/chat/tools/CaseloadViz";
import ScaffoldedPlanViz from "@/components/chat/tools/ScaffoldedPlanViz";

// Transport is stable — defined outside component
const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: () => ({ sessionId: useChatStore.getState().currentSessionId }),
});

// ─── Markdown bubble ────────────────────────────────────────────────────────

function MarkdownBubble({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          text
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary underline underline-offset-2 hover:no-underline"
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-background/50 rounded px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ─── Outer shell: loads persisted session, then renders inner pane ───────────

export default function ChatPane() {
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
        if (data?.messages?.length) {
          setInitialMessages(data.messages as UIMessage[]);
        }
        setReady(true);
      });
  }, [conversationKey]);

  if (!ready) {
    return (
      <div className="w-[380px] shrink-0 border-l flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <p className="text-sm font-semibold">Therapay Assistant</p>
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <ChatPaneInner
      key={conversationKey}
      initialMessages={initialMessages}
      onNewConversation={newConversation}
    />
  );
}

// ─── Inner pane: owns useChat, message list, input ───────────────────────────

function ChatPaneInner({
  initialMessages,
  onNewConversation,
}: {
  initialMessages?: UIMessage[];
  onNewConversation: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<UIMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    onFinish: () => {
      const sessionId = useChatStore.getState().currentSessionId;
      if (!sessionId) return;
      createSupabaseBrowserClient()
        .from("chat_sessions")
        .update({ messages: messagesRef.current })
        .eq("id", sessionId)
        .then(() => {});
    },
  });

  // Keep ref in sync for onFinish closure
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Scroll chat container on new messages / streaming
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, status]);

  function handleSend(text: string) {
    if (!text.trim()) return;
    if (messages.length === 0) {
      useChatStore.getState().createSession();
    }
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  const showStarters = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="w-[380px] shrink-0 border-l flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <p className="text-sm font-semibold">Therapay Assistant</p>
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

      {/* Message thread */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3">
        {showStarters ? (
          <div className="space-y-2 pt-4">
            <p className="text-xs text-muted-foreground mb-3">How can I help you today?</p>
            {CONVERSATION_STARTERS.map((starter) => (
              <button
                key={starter}
                onClick={() => handleSend(starter)}
                className="w-full text-left text-sm rounded-lg border border-border px-3 py-2.5 hover:bg-accent transition-colors"
              >
                {starter}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div key={msg.id} className="space-y-2">
                  {msg.parts.map((part, partIdx) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const p = part as any;

                    if (p.type === "text" && p.text) {
                      return (
                        <MarkdownBubble
                          key={partIdx}
                          text={p.text}
                          isUser={isUser}
                        />
                      );
                    }

                    // AI SDK v6: tool parts have type "tool-{toolName}" with state "output-available"
                    if (!isUser && typeof p.type === "string" && p.type.startsWith("tool-") && p.state === "output-available") {
                      const toolName = p.type.slice(5); // strip "tool-" prefix
                      const output = p.output;
                      if (!output || output.error) return null;
                      if (toolName === "analyzePayerMix") {
                        return <PayerMixViz key={partIdx} data={output} />;
                      }
                      if (toolName === "analyzeCurrentPayers") {
                        return <CaseloadViz key={partIdx} data={output} />;
                      }
                      if (toolName === "showScaffoldedPlan") {
                        return <ScaffoldedPlanViz key={partIdx} data={output} />;
                      }
                      // saveGoals — render nothing
                    }

                    return null;
                  })}
                </div>
              );
            })}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3.5 py-2.5">
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input footer */}
      <div className="p-3 border-t shrink-0">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 h-9 text-sm"
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={isStreaming || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
