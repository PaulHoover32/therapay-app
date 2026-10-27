import { tool } from "ai";
import { z } from "zod";
import { PANEL_VIEWS } from "@/lib/panel-views";

export const showView = () =>
  tool({
    description: "Show a view in the app's side panel. Use it to put relevant data on screen during the conversation.",
    inputSchema: z.object({
      view: z.enum(PANEL_VIEWS).describe("Which view to show"),
      title: z.string().max(80).optional().describe("Short heading, required for chart"),
      sql: z.string().max(4000).optional().describe("chart only: SELECT returning a label column then 1-3 numeric columns"),
      chartType: z.enum(["bar", "line", "area"]).optional().describe("chart only"),
    }),
    execute: async (input) => ({ shown: input.view }),
  });
