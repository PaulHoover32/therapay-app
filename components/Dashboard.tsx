"use client";

import { useState } from "react";
import { Session, SessionInput, TherapistProfile, ReferencePayer, ReferenceSessionCode, Goal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserCircle, PlusCircle, Target } from "lucide-react";
import EarningsChart from "./EarningsChart";
import GoalsOverview from "./GoalsOverview";
import LeverCards from "./LeverCards";
import SessionLedger from "./SessionLedger";
import StaleDataBanner from "./StaleDataBanner";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { parseISO, differenceInDays } from "date-fns";

interface Props {
  initialSessions: Session[];
  profile: TherapistProfile;
  payers: ReferencePayer[];
  sessionCodes: ReferenceSessionCode[];
  activeGoal: Goal | null;
}

function EmptyState() {
  return (
    <Card className="max-w-lg mx-auto mt-16">
      <CardHeader>
        <CardTitle>Welcome to Therapay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Get started in three steps to see your earnings dashboard.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
              <UserCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Complete your profile</p>
              <Link href="/profile" className="text-xs text-primary underline">
                Go to /profile →
              </Link>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Set your annual income goal</p>
              <Link href="/profile" className="text-xs text-primary underline">
                Go to /profile →
              </Link>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
              <PlusCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Add your first session</p>
              <p className="text-xs text-muted-foreground">Use the Add Session button in the session ledger.</p>
            </div>
          </div>
        </div>
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

  const isEmpty = sessions.length === 0;

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

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      {daysSinceLastSession !== null && daysSinceLastSession >= 14 && (
        <StaleDataBanner
          daysSinceLastSession={daysSinceLastSession}
          onLogSession={() => document.getElementById("session-ledger")?.scrollIntoView({ behavior: "smooth" })}
        />
      )}

      <GoalsOverview sessions={sessions} activeGoal={activeGoal} effectiveToday={effectiveToday} />

      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <EarningsChart sessions={sessions} profile={profile} activeGoal={activeGoal} />
        </CardContent>
      </Card>

      <LeverCards sessions={sessions} profile={profile} activeGoal={activeGoal} effectiveToday={effectiveToday} />

      <Separator />

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
