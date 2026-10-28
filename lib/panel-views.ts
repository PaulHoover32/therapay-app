// Views the assistant can open in the side panel via the showView tool
export const PANEL_VIEWS = ["summary", "sessions", "goal", "profile", "chart"] as const;
export type PanelView = (typeof PANEL_VIEWS)[number];

export interface PanelState {
  view: PanelView;
  title?: string;
  sql?: string;
  chartType?: "bar" | "line" | "area";
}

export const PANEL_VIEW_LABELS: Record<PanelView, string> = {
  summary: "Earnings summary",
  sessions: "Sessions",
  goal: "Goal",
  profile: "Practice profile",
  chart: "Chart",
};
