"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Goal, Recommendation } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ApplyRecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: Recommendation;
  currentGoal: Goal | null;
}

export default function ApplyRecommendationDialog({
  open,
  onOpenChange,
  recommendation,
  currentGoal,
}: ApplyRecommendationDialogProps) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    setApplying(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setApplying(false); return; }

    const now = new Date().toISOString();
    const year = new Date().getFullYear();

    // Deactivate existing active goal
    await supabase
      .from("goals")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("goal_year", year)
      .eq("is_active", true);

    // Insert new goal from recommendation
    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      goal_year: year,
      annual_income_target: recommendation.annual_income_target,
      target_weekly_hours: recommendation.target_weekly_hours,
      target_avg_payout: recommendation.target_avg_payout,
      is_active: true,
      last_modified_by: "ai",
      last_modified_at: now,
    });

    setApplying(false);
    if (error) {
      toast.error("Failed to apply recommendation.");
      return;
    }
    toast.success("Recommendation applied.");
    onOpenChange(false);
    router.refresh();
  }

  function fmt(n: number) {
    return `$${n.toLocaleString()}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply Recommendation</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Current Goal
            </p>
            {currentGoal ? (
              <>
                <Stat label="Annual Target" value={fmt(currentGoal.annual_income_target)} />
                <Stat label="Weekly Hours" value={`${currentGoal.target_weekly_hours.toFixed(1)} hrs`} />
                <Stat label="Avg Payout" value={fmt(currentGoal.target_avg_payout)} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active goal</p>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              This Recommendation
            </p>
            <Stat label="Annual Target" value={fmt(recommendation.annual_income_target)} highlight />
            <Stat label="Weekly Hours" value={`${recommendation.target_weekly_hours.toFixed(1)} hrs`} highlight />
            <Stat label="Avg Payout" value={fmt(recommendation.target_avg_payout)} highlight />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "Applying…" : "Apply Recommendation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
