"use client";

import type { FC } from "react";
import { ArrowDownIcon } from "lucide-react";
import { AuiIf, MessagePrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Reasoning, ReasoningContent, ReasoningRoot, ReasoningText, ReasoningTrigger } from "@/components/assistant-ui/reasoning";
import { ToolGroupContent, ToolGroupRoot, ToolGroupTrigger } from "@/components/assistant-ui/tool-group";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import EmptyState from "./EmptyState";
import ShowViewChip from "./tool-ui/ShowViewChip";

// Tools with their own inline UI render outside the collapsed "used tools" group
const INLINE_TOOLS = new Set(["showView"]);

interface Props {
  firstName: string | null;
  isNewUser: boolean;
  onStarter: (text: string) => void;
}

export default function Thread({ firstName, isNewUser, onStarter }: Props) {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto scroll-smooth">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <EmptyState firstName={firstName} isNewUser={isNewUser} onStarter={onStarter} />
          </AuiIf>
          <div className="mb-6 flex flex-col gap-y-6 empty:hidden">
            <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto flex justify-center pb-2">
            <ThreadPrimitive.ScrollToBottom asChild>
              <TooltipIconButton tooltip="Scroll to bottom" variant="outline" className="rounded-full disabled:invisible">
                <ArrowDownIcon />
              </TooltipIconButton>
            </ThreadPrimitive.ScrollToBottom>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

const Message: FC = () => {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
};

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="fade-in slide-in-from-bottom-1 flex animate-in justify-end duration-150">
    <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-foreground wrap-break-word">
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="fade-in slide-in-from-bottom-1 animate-in px-1 leading-relaxed text-foreground duration-150 wrap-break-word">
    <MessagePrimitive.GroupedParts
      groupBy={(part) => {
        if (part.type === "reasoning") return ["group-chainOfThought", "group-reasoning"];
        if (part.type === "tool-call" && !INLINE_TOOLS.has(part.toolName)) return ["group-chainOfThought", "group-tool"];
        return null;
      }}
    >
      {({ part, children }) => {
        switch (part.type) {
          case "group-chainOfThought":
            return <div>{children}</div>;
          case "group-reasoning": {
            const running = part.status.type === "running";
            return (
              <ReasoningRoot defaultOpen={running}>
                <ReasoningTrigger active={running} />
                <ReasoningContent aria-busy={running}>
                  <ReasoningText>{children}</ReasoningText>
                </ReasoningContent>
              </ReasoningRoot>
            );
          }
          case "group-tool":
            return (
              <ToolGroupRoot>
                <ToolGroupTrigger count={part.indices.length} active={part.status.type === "running"} />
                <ToolGroupContent>{children}</ToolGroupContent>
              </ToolGroupRoot>
            );
          case "text":
            return <MarkdownText />;
          case "reasoning":
            return <Reasoning {...part} />;
          case "tool-call":
            if (part.toolName === "showView") return <ShowViewChip args={part.args} />;
            return part.toolUI ?? <ToolFallback {...part} />;
          default:
            return null;
        }
      }}
    </MessagePrimitive.GroupedParts>
    <MessagePrimitive.Error>
      <p className="mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
        Something went wrong. Try sending that again.
      </p>
    </MessagePrimitive.Error>
  </MessagePrimitive.Root>
);
