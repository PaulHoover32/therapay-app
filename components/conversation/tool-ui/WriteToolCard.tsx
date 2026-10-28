"use client";

import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CLICK_ONLY_TOOLS, type WriteTool } from "@/lib/ai/write-tools";
import { useToolCall } from "../ToolStateContext";
import { describeWrite } from "./describeWrite";

// Confirmation card for data-changing tools: shows exactly what will be written,
// then the outcome. The server won't run the tool until Confirm (or a spoken yes).
export default function WriteToolCard({ toolCallId, toolName }: { toolCallId: string; toolName: WriteTool }) {
  const { call, respond } = useToolCall(toolCallId);
  if (!call) return null;
  const { title, rows, note } = describeWrite(toolName, call.input);
  const destructive = CLICK_ONLY_TOOLS.includes(toolName);
  const output = call.output as { success?: boolean; error?: string } | undefined;
  const failed = call.state === "output-error" || output?.success === false;

  if (call.state === "output-denied") {
    return <p className="my-2 text-xs text-muted-foreground">Cancelled: {title.replace(/\?$/, "").toLowerCase()}</p>;
  }

  return (
    <div className={cn("my-3 max-w-md rounded-2xl border bg-card p-4", destructive && "border-destructive/40")}>
      <p className="text-sm font-medium">{title}</p>
      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}

      <div className="mt-4">
        {call.state === "approval-requested" && call.approvalId && (
          <div className="flex gap-2">
            <Button size="sm" variant={destructive ? "destructive" : "default"} onClick={() => respond(call.approvalId!, true)}>
              <Check className="size-4" /> {destructive ? "Delete" : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => respond(call.approvalId!, false)}>
              <X className="size-4" /> Cancel
            </Button>
          </div>
        )}
        {(call.state === "approval-responded" || call.state === "input-available") && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Saving…
          </p>
        )}
        {call.state === "output-available" && !failed && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" /> Saved
          </p>
        )}
        {failed && <p className="text-xs text-destructive">Couldn&apos;t save: {output?.error ?? "something went wrong"}</p>}
      </div>
    </div>
  );
}
