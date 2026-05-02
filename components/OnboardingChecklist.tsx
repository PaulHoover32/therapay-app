"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";

function ChecklistItem({
  done,
  label,
  description,
  action,
}: {
  done: boolean;
  label: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {done ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", done ? "line-through text-violet-600" : "text-violet-100")}>{label}</p>
        {!done && <p className="text-xs text-violet-400 mt-0.5">{description}</p>}
      </div>
      {!done && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default function OnboardingChecklist({
  profileComplete,
  sessionLogged,
  goalSet,
  onLogSession,
}: {
  profileComplete: boolean;
  sessionLogged: boolean;
  goalSet: boolean;
  onLogSession: () => void;
}) {
  const doneCount = [profileComplete, sessionLogged, goalSet].filter(Boolean).length;

  return (
    <Card className="border-violet-800 bg-violet-950/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-violet-100">Get started</CardTitle>
          <span className="text-sm text-violet-400">{doneCount} of 3 complete</span>
        </div>
        <div className="w-full bg-violet-900/50 rounded-full h-1.5 mt-2">
          <div
            className="bg-violet-400 rounded-full h-1.5 transition-all duration-500"
            style={{ width: `${(doneCount / 3) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChecklistItem
          done={profileComplete}
          label="Set up your practice profile"
          description="Add your license type, specialties, and practice info via the assistant."
          action={<Link href="/profile" className="text-xs text-violet-300 hover:text-violet-100 hover:underline">Set up →</Link>}
        />
        <ChecklistItem
          done={sessionLogged}
          label="Log your first session"
          description="Add a past or recent session to unlock your earnings dashboard."
          action={
            <button onClick={onLogSession} className="text-xs text-violet-300 hover:text-violet-100 hover:underline">
              Add session →
            </button>
          }
        />
        <ChecklistItem
          done={goalSet}
          label="Set your income goal"
          description="Use the assistant to model scenarios and set a financial goal for the year."
          action={
            <button
              onClick={() => useChatStore.getState().triggerStarter("Model scenarios and set goals")}
              className="text-xs text-violet-300 hover:text-violet-100 hover:underline"
            >
              Set goal →
            </button>
          }
        />
      </CardContent>
    </Card>
  );
}
