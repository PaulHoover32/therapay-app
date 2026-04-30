"use client";

import { useState, useEffect, useRef } from "react";
import { Session, SessionInput, TherapistProfile, ReferencePayer, ReferenceSessionCode, Goal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle } from "lucide-react";
import EarningsChart from "./EarningsChart";
import LeverCards from "./LeverCards";
import SessionLedger from "./SessionLedger";
import StaleDataBanner from "./StaleDataBanner";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useChatStore } from "@/store/chatStore";
import { toast } from "sonner";
import { parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  initialSessions: Session[];
  profile: TherapistProfile;
  payers: ReferencePayer[];
  sessionCodes: ReferenceSessionCode[];
  activeGoal: Goal | null;
}

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

function OnboardingChecklist({
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

function enrich(s: Record<string, unknown>, sessionCodes: ReferenceSessionCode[], payers: ReferencePayer[]): Session {
  const code = sessionCodes.find((c) => c.code === s.session_code);
  const payerRef = payers.find((p) => p.name === s.payer);
  return {
    ...s,
    appointment_type: code?.appointment_type ?? "individual",
    session_duration: code?.session_duration ?? 0,
    payment_option: payerRef?.payment_option ?? "insurance",
  } as unknown as Session;
}

export default function Dashboard({ initialSessions, profile, payers, sessionCodes, activeGoal }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  const profileComplete = !!(profile.license_type && profile.specialties);
  const sessionLogged = sessions.length > 0;
  const goalSet = activeGoal !== null;
  const allComplete = profileComplete && sessionLogged && goalSet;
  const isEmpty = !sessionLogged;

  const checklistWasShown = useRef(!allComplete);
  const toastFired = useRef(false);

  useEffect(() => {
    if (allComplete && checklistWasShown.current && !toastFired.current) {
      toastFired.current = true;
      toast.success("You're all set! Your dashboard is ready.", { duration: 6000 });
    }
  }, [allComplete]);

  const latestSessionDate = sessions.length > 0
    ? sessions.reduce((latest, s) => {
        const d = parseISO(s.session_datetime);
        return d > latest ? d : latest;
      }, parseISO(sessions[0].session_datetime))
    : null;
  const daysSinceLastSession = latestSessionDate
    ? differenceInDays(new Date(), latestSessionDate)
    : null;

  const effectiveToday =
    latestSessionDate && latestSessionDate.getFullYear() < new Date().getFullYear()
      ? latestSessionDate
      : new Date();

  async function handleAdd(input: SessionInput) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ ...input, therapist_id: profile.id })
      .select("id, created_at, updated_at, session_datetime, amount, session_code, state, payer")
      .single();
    if (error) { toast.error("Failed to save session."); return; }
    setSessions((prev) => [enrich(data as Record<string, unknown>, sessionCodes, payers), ...prev]);
    toast.success("Session saved.");
  }

  async function handleUpdate(updated: Session) {
    const supabase = createSupabaseBrowserClient();
    const { session_datetime, amount, session_code, state, payer } = updated;
    const { data, error } = await supabase
      .from("sessions")
      .update({ session_datetime, amount, session_code, state, payer })
      .eq("id", updated.id)
      .select("id, created_at, updated_at, session_datetime, amount, session_code, state, payer")
      .single();
    if (error) { toast.error("Failed to update session."); return; }
    const enriched = enrich(data as Record<string, unknown>, sessionCodes, payers);
    setSessions((prev) => prev.map((s) => (s.id === enriched.id ? enriched : s)));
    toast.success("Session updated.");
  }

  async function handleDelete(id: string) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) { toast.error("Failed to delete session."); return; }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session deleted.");
  }

  return (
    <div className="space-y-8">
      {!allComplete && (
        <OnboardingChecklist
          profileComplete={profileComplete}
          sessionLogged={sessionLogged}
          goalSet={goalSet}
          onLogSession={() => document.getElementById("session-ledger")?.scrollIntoView({ behavior: "smooth" })}
        />
      )}

      {!isEmpty && daysSinceLastSession !== null && daysSinceLastSession >= 14 && (
        <StaleDataBanner
          daysSinceLastSession={daysSinceLastSession}
          onLogSession={() => document.getElementById("session-ledger")?.scrollIntoView({ behavior: "smooth" })}
        />
      )}

      {!isEmpty && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Earnings Overview</CardTitle>
              {activeGoal && (
                <p className="text-sm text-muted-foreground">
                  Annual goal:{" "}
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(activeGoal.annual_income_target)}
                  </span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <EarningsChart sessions={sessions} profile={profile} activeGoal={activeGoal} />
            </CardContent>
          </Card>

          <LeverCards sessions={sessions} profile={profile} activeGoal={activeGoal} effectiveToday={effectiveToday} />

          <Separator />
        </>
      )}

      <div id="session-ledger">
        <SessionLedger
          sessions={sessions}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
          payers={payers}
          sessionCodes={sessionCodes}
        />
      </div>
    </div>
  );
}
