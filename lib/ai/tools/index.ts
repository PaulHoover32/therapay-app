import type { Tool, ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ToolContext } from "./context";
import { queryData } from "./queryData";
import { getEarningsSummary } from "./getEarningsSummary";
import { showView } from "./showView";
import { logSession } from "./logSession";
import { editSession } from "./editSession";
import { deleteSession } from "./deleteSession";
import { bulkInsertSessions } from "./bulkInsertSessions";
import { saveGoals } from "./saveGoals";
import { updatePracticeInfo } from "./updatePracticeInfo";
import { sendPasswordReset } from "./sendPasswordReset";

const MAX_LOGGED_OUTPUT = 4000;

// Wraps execute so every call is recorded (written to tool_call_logs after the thread saves)
function logged<T extends Tool>(name: string, t: T, ctx: ToolContext): T {
  const execute = t.execute;
  if (!execute) return t;
  return {
    ...t,
    execute: async (input: unknown, options: unknown) => {
      const started = Date.now();
      try {
        const output = await (execute as (i: unknown, o: unknown) => Promise<unknown>)(input, options);
        const failed = typeof output === "object" && output !== null && ("error" in output || (output as { success?: boolean }).success === false);
        const json = JSON.stringify(output) ?? "null";
        ctx.logs.push({
          tool_name: name,
          status: failed ? "error" : "success",
          input,
          output: json.length > MAX_LOGGED_OUTPUT ? { truncated: true, preview: json.slice(0, MAX_LOGGED_OUTPUT) } : output,
          duration_ms: Date.now() - started,
        });
        return output;
      } catch (e) {
        ctx.logs.push({ tool_name: name, status: "error", input, output: { error: (e as Error).message }, duration_ms: Date.now() - started });
        throw e;
      }
    },
  } as T;
}

export function buildTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {
    queryData: queryData(ctx),
    getEarningsSummary: getEarningsSummary(ctx),
    showView: showView(),
    logSession: logSession(ctx),
    editSession: editSession(ctx),
    deleteSession: deleteSession(ctx),
    bulkInsertSessions: bulkInsertSessions(ctx),
    saveGoals: saveGoals(ctx),
    updatePracticeInfo: updatePracticeInfo(ctx),
    sendPasswordReset: sendPasswordReset(ctx),
  };
  const wrapped = Object.fromEntries(Object.entries(tools).map(([name, t]) => [name, logged(name, t, ctx)]));
  return { ...wrapped, web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) };
}
