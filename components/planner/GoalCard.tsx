"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Goal } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChatStore } from "@/store/chatStore";

interface GoalCardProps {
  goal: Goal | null;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const triggerStarter = useChatStore((s) => s.triggerStarter);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    annual_income_target: goal?.annual_income_target ?? 0,
    target_weekly_hours: goal?.target_weekly_hours ?? 0,
    target_avg_payout: goal?.target_avg_payout ?? 0,
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const now = new Date().toISOString();

    let error;
    if (!goal) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); toast.error("Not authenticated."); return; }
      ({ error } = await supabase.from("goals").insert({
        user_id: user.id,
        goal_year: new Date().getFullYear(),
        annual_income_target: values.annual_income_target,
        target_weekly_hours: values.target_weekly_hours,
        target_avg_payout: values.target_avg_payout,
        is_active: true,
        last_modified_by: "user",
        last_modified_at: now,
      }));
    } else {
      ({ error } = await supabase
        .from("goals")
        .update({
          annual_income_target: values.annual_income_target,
          target_weekly_hours: values.target_weekly_hours,
          target_avg_payout: values.target_avg_payout,
          last_modified_by: "user",
          last_modified_at: now,
        })
        .eq("id", goal.id));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save goal.");
      return;
    }
    setEditing(false);
    toast.success(goal ? "Goal updated." : "Goals set!");
    router.refresh();
  }

  function handleCancel() {
    setValues({
      annual_income_target: goal?.annual_income_target ?? 0,
      target_weekly_hours: goal?.target_weekly_hours ?? 0,
      target_avg_payout: goal?.target_avg_payout ?? 0,
    });
    setEditing(false);
  }

  const editForm = (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Annual Income Target</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              className="pl-6"
              value={values.annual_income_target}
              onChange={(e) =>
                setValues((v) => ({ ...v, annual_income_target: Number(e.target.value) }))
              }
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Weekly Hours</Label>
          <Input
            type="number"
            step="0.1"
            value={values.target_weekly_hours}
            onChange={(e) =>
              setValues((v) => ({ ...v, target_weekly_hours: Number(e.target.value) }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Avg Payout / Session</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              className="pl-6"
              value={values.target_avg_payout}
              onChange={(e) =>
                setValues((v) => ({ ...v, target_avg_payout: Number(e.target.value) }))
              }
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );

  if (!goal) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle>Your Goals</CardTitle>
          {!editing && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white"
                onClick={() => triggerStarter("Model scenarios and set goals")}
              >
                Get AI Recommendation
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Set Goals
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editing ? editForm : (
            <p className="text-sm text-muted-foreground">
              No goals set yet. Get an AI recommendation or set your own targets manually.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Your Goals</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated {formatDate(goal.last_modified_at)} · Set by{" "}
            {goal.last_modified_by === "ai" ? "AI" : "you"}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? editForm : (
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
        )}
      </CardContent>
    </Card>
  );
}
