"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Goal } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useChatStore } from "@/store/chatStore";

interface GoalCardProps {
  goal: Goal | null;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const triggerStarter = useChatStore((s) => s.triggerStarter);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleClear() {
    if (!goal) return;
    setClearing(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("goals")
      .update({ is_active: false })
      .eq("id", goal.id);
    setClearing(false);
    setClearDialogOpen(false);
    if (error) {
      toast.error("Failed to clear goals.");
      return;
    }
    toast.success("Goals cleared.");
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Your Goals</CardTitle>
            {goal && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated {formatDate(goal.last_modified_at)} · Set by{" "}
                {goal.last_modified_by === "ai" ? "AI" : "you"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {goal && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setClearDialogOpen(true)}
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => triggerStarter("Model scenarios and set goals")}
            >
              Get AI Recommendation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goal ? (
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Annual Target</p>
                <p className="text-2xl font-semibold">
                  ${goal.annual_income_target.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Weekly Hours</p>
                <p className="text-2xl font-semibold">{goal.target_weekly_hours.toFixed(1)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Payout / Session</p>
                <p className="text-2xl font-semibold">
                  ${goal.target_avg_payout.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No goals set yet. Chat with the Therapay assistant to get a personalized recommendation.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your goals?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your current goals. You can set new ones anytime by chatting with the Therapay assistant or applying a past recommendation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? "Clearing…" : "Clear goals"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
