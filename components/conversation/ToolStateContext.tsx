"use client";

import { createContext, useContext } from "react";

export interface ToolCallState {
  toolName: string;
  state: string; // AI SDK tool part state: input-available | approval-requested | approval-responded | output-available | output-error | output-denied
  input: Record<string, unknown> | undefined;
  output: unknown;
  approvalId?: string;
}

interface ToolStateValue {
  calls: Map<string, ToolCallState>;
  respond: (approvalId: string, approved: boolean) => void;
}

// Raw AI SDK tool-part state, keyed by toolCallId. assistant-ui doesn't surface approval state,
// so confirmation cards read it from here.
export const ToolStateContext = createContext<ToolStateValue>({ calls: new Map(), respond: () => {} });

export const useToolCall = (toolCallId: string) => {
  const { calls, respond } = useContext(ToolStateContext);
  return { call: calls.get(toolCallId), respond };
};
