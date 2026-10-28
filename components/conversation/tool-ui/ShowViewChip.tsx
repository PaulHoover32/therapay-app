"use client";

import { PanelRight } from "lucide-react";
import { usePanelStore } from "@/lib/stores/panel";
import { PANEL_VIEW_LABELS, type PanelState } from "@/lib/panel-views";

// Inline chip for a showView tool call; clicking reopens that view
export default function ShowViewChip({ args }: { args: Partial<PanelState> | undefined }) {
  const show = usePanelStore((s) => s.show);
  if (!args?.view) return null;
  const state = args as PanelState;
  const label = state.view === "chart" && state.title ? state.title : PANEL_VIEW_LABELS[state.view];
  return (
    <button
      type="button"
      onClick={() => show(state)}
      className="my-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <PanelRight className="size-3" />
      {label}
    </button>
  );
}
