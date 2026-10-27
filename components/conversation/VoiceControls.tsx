"use client";

import { AudioLines, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VoiceMode, VoiceState } from "@/hooks/use-voice";

interface Props {
  state: VoiceState;
  mode: VoiceMode | null;
  disabled: boolean;
  onPttStart: () => void;
  onPttEnd: () => void;
  onToggleHandsfree: () => void;
  onHover: () => void;
}

export default function VoiceControls({ state, mode, disabled, onPttStart, onPttEnd, onToggleHandsfree, onHover }: Props) {
  const pttActive = mode === "ptt" && state === "listening";
  const handsfree = mode === "handsfree";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={pttActive ? "default" : "ghost"}
            disabled={disabled || handsfree}
            aria-label="Hold to talk"
            className={cn("size-9 rounded-full touch-none select-none", pttActive && "animate-pulse")}
            onPointerEnter={onHover}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onPttStart();
            }}
            onPointerUp={onPttEnd}
            onPointerCancel={onPttEnd}
          >
            {mode === "ptt" && state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Hold to talk (or hold Space)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={handsfree ? "default" : "ghost"}
            disabled={disabled}
            aria-pressed={handsfree}
            aria-label="Hands-free conversation"
            className="size-9 rounded-full"
            onPointerEnter={onHover}
            onClick={onToggleHandsfree}
          >
            {handsfree && state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{handsfree ? "End hands-free" : "Hands-free: just talk"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
