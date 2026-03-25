"use client";

import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chatStore";

export default function ChatButton() {
  const { isOpen, toggle } = useChatStore();

  return (
    <Button
      onClick={toggle}
      size="icon"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
    </Button>
  );
}
