"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  daysSinceLastSession: number;
  onLogSession: () => void;
}

export default function StaleDataBanner({ daysSinceLastSession, onLogSession }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Info className="w-4 h-4 shrink-0" />
        <span>
          Your last session was logged{" "}
          <span className="font-medium">{daysSinceLastSession} days ago</span>
          {" "}— add recent sessions to keep your forecast on track.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onLogSession}
        className="shrink-0"
      >
        Log a session →
      </Button>
    </div>
  );
}
