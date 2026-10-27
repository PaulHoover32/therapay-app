"use client";

import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePanelStore } from "@/lib/stores/panel";
import { PANEL_VIEW_LABELS, PANEL_VIEWS, type PanelState } from "@/lib/panel-views";
import SummaryView from "./views/SummaryView";
import SessionsView from "./views/SessionsView";
import GoalView from "./views/GoalView";
import ProfileView from "./views/ProfileView";
import ChartView from "./views/ChartView";

function renderView(state: PanelState) {
  switch (state.view) {
    case "summary":
      return <SummaryView />;
    case "sessions":
      return <SessionsView />;
    case "goal":
      return <GoalView />;
    case "profile":
      return <ProfileView />;
    case "chart":
      return <ChartView title={state.title} sql={state.sql} chartType={state.chartType} />;
  }
}

export default function SidePanel() {
  const current = usePanelStore((s) => s.current);
  const canGoBack = usePanelStore((s) => s.history.length > 0);
  const show = usePanelStore((s) => s.show);
  const back = usePanelStore((s) => s.back);
  const label = current.view === "chart" && current.title ? current.title : PANEL_VIEW_LABELS[current.view];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        <Button variant="ghost" size="icon" className="size-8" onClick={back} disabled={!canGoBack} aria-label="Previous view">
          <ArrowLeft className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="min-w-0 gap-1 font-medium">
              <span className="truncate">{label}</span>
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PANEL_VIEWS.filter((v) => v !== "chart").map((v) => (
              <DropdownMenuItem key={v} onSelect={() => show({ view: v })}>
                {PANEL_VIEW_LABELS[v]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Keyed so each view (and chart query) mounts fresh */}
      <div key={`${current.view}:${current.sql ?? ""}`} className="min-h-0 flex-1 overflow-y-auto p-4">
        {renderView(current)}
      </div>
    </div>
  );
}
