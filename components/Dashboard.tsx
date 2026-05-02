"use client";

import { useState, useEffect, useRef } from "react";
import { Session, SessionInput, TherapistProfile, ReferencePayer, ReferenceSessionCode, Goal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import EarningsChart from "./EarningsChart";
import LeverCards from "./LeverCards";
import SessionLedger from "./SessionLedger";
import StaleDataBanner from "./StaleDataBanner";
import OnboardingChecklist from "./OnboardingChecklist";
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
