// Tools that change data. Shared by server (needsApproval) and client (confirmation cards, panel refresh).
export const WRITE_TOOLS = [
  "logSession",
  "editSession",
  "deleteSession",
  "bulkInsertSessions",
  "saveGoals",
  "updatePracticeInfo",
  "sendPasswordReset",
] as const;
export type WriteTool = (typeof WRITE_TOOLS)[number];

export const isWriteTool = (name: string): name is WriteTool => (WRITE_TOOLS as readonly string[]).includes(name);

// Destructive tools can only be approved with a click, never by voice
export const CLICK_ONLY_TOOLS: readonly WriteTool[] = ["deleteSession"];
