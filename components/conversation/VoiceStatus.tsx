"use client";

import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VoiceMode, VoiceState } from "@/hooks/use-voice";

const LABELS: Record<VoiceState, string> = {
  idle: "",
  loading: "Loading on-device speech recognition",
  listening: "Listening",
  transcribing: "Transcribing",
  thinking: "Thinking",
  speaking: "Speaking",
};

interface Props {
  state: VoiceState;
  mode: VoiceMode | null;
  partial: string;
  asrProgress: number;
  onInterrupt: () => void;
}

// Status strip above the composer: state orb, live transcript (local only), and interrupt
export default function VoiceStatus({ state, mode, partial, asrProgress, onInterrupt }: Props) {
  if (state === "idle" && !mode) return null;
  const label =
    state === "loading" && asrProgress > 0 && asrProgress < 100 ? `${LABELS.loading} · ${Math.round(asrProgress)}%` : LABELS[state];

  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl border bg-muted/40 px-3 py-2" aria-live="polite">
      <span
        className={cn(
          "size-3 shrink-0 rounded-full bg-muted-foreground/40",
          state === "listening" && "animate-pulse bg-emerald-500",
          state === "transcribing" && "animate-pulse bg-amber-500",
          state === "thinking" && "animate-pulse bg-sky-500",
          state === "speaking" && "animate-pulse bg-violet-500"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {label || (mode === "handsfree" ? "Hands-free on" : "")}
          {mode === "handsfree" && state === "listening" && " · just start talking"}
        </p>
        {partial && <p className="truncate text-sm">{partial}</p>}
      </div>
      {(state === "speaking" || state === "thinking") && (
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onInterrupt}>
          <Square className="size-3 fill-current" /> Stop
        </Button>
      )}
    </div>
  );
}
