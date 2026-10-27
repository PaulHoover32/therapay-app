"use client";

import { useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
}

export default function Composer({ onSend, onStop, busy }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setText("");
    ref.current?.focus();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-3xl border bg-background p-2 transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20"
    >
      <Textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about your practice…"
        rows={1}
        autoFocus
        aria-label="Message"
        className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {busy ? (
        <Button type="button" size="icon" className="size-9 shrink-0 rounded-full" onClick={onStop} aria-label="Stop">
          <Square className="size-3 fill-current" />
        </Button>
      ) : (
        <Button type="submit" size="icon" className="size-9 shrink-0 rounded-full" disabled={!text.trim()} aria-label="Send">
          <ArrowUp className="size-4" />
        </Button>
      )}
    </form>
  );
}
