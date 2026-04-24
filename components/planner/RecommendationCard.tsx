"use client";

import { useState } from "react";
import { Goal, Recommendation } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ApplyRecommendationDialog from "@/components/planner/ApplyRecommendationDialog";

interface RecommendationCardProps {
  recommendation: Recommendation;
  currentGoal: Goal | null;
  onDelete: () => void;
}

export default function RecommendationCard({
  recommendation: rec,
  currentGoal,
  onDelete,
}: RecommendationCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const date = new Date(rec.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/recommendations/${rec.id}`, { method: "PATCH" });
      onDelete();
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{date}</p>
              <p className="text-xs text-muted-foreground">
                Based on ${rec.ytd_revenue_at_time.toLocaleString()} YTD ·{" "}
                {rec.avg_weekly_hours_at_time.toFixed(1)} hrs/week ·{" "}
                ${rec.avg_payout_at_time.toFixed(0)} avg payout ·{" "}
                {rec.weeks_remaining_at_input} weeks remaining
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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
              <p className="text-xs text-muted-foreground mb-0.5">Weekly Hours</p>
              <p className="text-base font-semibold">{rec.target_weekly_hours.toFixed(1)} hrs</p>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recommendation?</AlertDialogTitle>
            <AlertDialogDescription>
              If you delete this recommendation, the Therapay assistant will no longer be able to
              reference it when helping you set future goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
