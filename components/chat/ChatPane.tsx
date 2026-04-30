"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Send, SquarePen, ArrowDown, Paperclip } from "lucide-react";
import ChatChartMessage from "./ChatChartMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/store/chatStore";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: () => ({ sessionId: useChatStore.getState().currentSessionId }),
});

const GREETING =
  "Ask me about anything in your practice — your earnings, payer mix, session trends, goals, or how to grow.";

const GREETING_NEW_USER =
  "Welcome! I'm your Therapay assistant. I can help set up your practice profile — things like your license type, how you bill clients, and the states you practice in. Click **\"Set up with the Therapay assistant\"** above, or just start typing.";

// ─── Markdown bubble ────────────────────────────────────────────────────────

function MarkdownBubble({
  text,
  isUser,
}: {
  text: string;
  isUser: boolean;
}) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-violet-950 text-violet-100"
        )}
      >
        {isUser ? (
          text
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-violet-300 underline underline-offset-2 hover:no-underline"
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-violet-900/50 rounded px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="text-xs w-full border-collapse">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-violet-800 px-2 py-1 text-left font-semibold bg-violet-900/50">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-violet-800 px-2 py-1">{children}</td>
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

// ─── Outer shell: handles session loading + pane resizing ────────────────────

export default function ChatPane({ isNewUser }: { isNewUser?: boolean }) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(380);
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

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    function onMove(ev: MouseEvent) {
      const delta = startX - ev.clientX;
      setWidth(Math.min(700, Math.max(260, startWidth + delta)));
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className="relative shrink-0 border-l flex flex-col h-full"
      style={{ width: `${width}px` }}
    >
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-500/40 transition-colors z-10"
        onMouseDown={handleDragStart}
      />

      {!ready ? (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <p className="text-sm font-semibold text-violet-400">Therapay Assistant</p>
          </div>
          <div className="flex-1" />
        </>
      ) : (
        <ChatPaneInner
          key={conversationKey}
          initialMessages={initialMessages}
          onNewConversation={newConversation}
          greeting={isNewUser ? GREETING_NEW_USER : GREETING}
        />
      )}
    </div>
  );
}

// ─── Inner pane: owns useChat, message list, input ───────────────────────────

function ChatPaneInner({
  initialMessages,
  onNewConversation,
  greeting,
}: {
  initialMessages?: UIMessage[];
  onNewConversation: () => void;
  greeting: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<UIMessage[]>(initialMessages ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    onFinish: () => {
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const sentinel = bottomRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function scrollToBottom() {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function handleSend(text: string) {
    if (!text.trim()) return;
    if (messages.length === 0) {
      useChatStore.getState().createSession();
    }
    sendMessage({ text });
    setInput("");
    setTimeout(scrollToBottom, 50);
  }

  useEffect(() => {
    const { pendingStarter, clearPendingStarter } = useChatStore.getState();
    if (pendingStarter) {
      clearPendingStarter();
      handleSend(pendingStarter);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      handleSend(`I'd like to import sessions from this file (${file.name}):\n\n${text}`);
    } catch {
      // file.text() failed — likely a binary format
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <>
      {/* Header */}
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

      {/* Message thread */}
      <div className="relative flex-1 min-h-0">
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 shadow-lg transition-colors"
        >
          <ArrowDown className="h-3 w-3" />
          Scroll to bottom
        </button>
      )}
      <div ref={containerRef} className="h-full overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {/* Greeting — always shown as the first message */}
          <MarkdownBubble text={greeting} isUser={false} />

          {messages.map((msg, msgIdx) => {
            const isUser = msg.role === "user";
            const isLastMsg = msgIdx === messages.length - 1;

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

                  // Render charts from renderChart tool results
                  if (
                    !isUser &&
                    p.type === "tool-renderChart" &&
                    p.state === "output-available"
                  ) {
                    return <ChatChartMessage key={partIdx} spec={p.output} />;
                  }

                  // All other tool parts render nothing — LLM communicates results in text
                  if (!isUser && typeof p.type === "string" && p.type.startsWith("tool-")) {
                    return null;
                  }

                  return null;
                })}
              </div>
            );
          })}

          <div ref={bottomRef} className="h-px" />

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-violet-950 rounded-2xl px-3.5 py-2.5">
                <span className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Input footer */}
      <div
        className={cn("p-3 border-t shrink-0 transition-colors", isDragging && "bg-violet-950/50")}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="text-xs text-violet-400 text-center mb-2">Drop file to import sessions</div>
        )}
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            title="Import session file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message or drop a file to import sessions..."
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
    </>
  );
}
