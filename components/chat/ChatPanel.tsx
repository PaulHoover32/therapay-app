"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/store/chatStore";
import { CONVERSATION_STARTERS } from "@/components/chat/starters";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function ChatPanel() {
  const { isOpen, close } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({ transport });

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text: string) {
    if (!text.trim()) return;
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  if (!isOpen) return null;

  const showStarters = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <Card className="fixed bottom-24 right-6 z-50 w-[400px] h-[560px] shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b shrink-0">
        <CardTitle className="text-sm font-semibold">Therapay Assistant</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Message thread */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 py-3">
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
                const text = msg.parts
                  .filter((p) => p.type === "text")
                  .map((p) => ("text" in p ? p.text : ""))
                  .join("");

                if (!text && msg.role !== "user") return null;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {text}
                    </div>
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
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input footer */}
      <CardFooter className="p-3 border-t shrink-0">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 h-9 text-sm"
            disabled={isStreaming}
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isStreaming || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
