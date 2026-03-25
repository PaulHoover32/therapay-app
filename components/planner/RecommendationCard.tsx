"use client";

import { useState } from "react";
import { Goal, Recommendation } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ApplyRecommendationDialog from "@/components/planner/ApplyRecommendationDialog";

interface RecommendationCardProps {
  recommendation: Recommendation;
  currentGoal: Goal | null;
}

export default function RecommendationCard({ recommendation: rec, currentGoal }: RecommendationCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const date = new Date(rec.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{date}</p>
              <p className="text-xs text-muted-foreground">
                Based on ${rec.ytd_revenue_at_time.toLocaleString()} YTD ·{" "}
                {rec.avg_weekly_sessions_at_time.toFixed(1)} sessions/week ·{" "}
                ${rec.avg_payout_at_time.toFixed(0)} avg payout ·{" "}
                {rec.weeks_remaining_at_input} weeks remaining
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{rec.summary}</p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Annual Target</p>
              <p className="text-base font-semibold">${rec.annual_income_target.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Weekly Sessions</p>
              <p className="text-base font-semibold">{rec.target_weekly_sessions}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Avg Payout</p>
              <p className="text-base font-semibold">${rec.target_avg_payout.toLocaleString()}</p>
            </div>
          </div>

          <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", reasoningOpen && "rotate-180")}
                />
                {reasoningOpen ? "Hide" : "View full reasoning"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {rec.reasoning}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <ApplyRecommendationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recommendation={rec}
        currentGoal={currentGoal}
      />
    </>
  );
}
