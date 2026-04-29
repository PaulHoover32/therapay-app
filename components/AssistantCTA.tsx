"use client";

import { useChatStore } from "@/store/chatStore";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface AssistantCTAProps {
  starter: string;
  label: string;
}

export default function AssistantCTA({ starter, label }: AssistantCTAProps) {
  const triggerStarter = useChatStore((s) => s.triggerStarter);

  return (
    <Button
      size="sm"
      className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
      onClick={() => triggerStarter(starter)}
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}
