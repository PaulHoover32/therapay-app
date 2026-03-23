"use client";

import { useState } from "react";
import { Session, SessionInput, TherapistProfile, ReferencePayer, ReferenceSessionCode } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserCircle, PlusCircle, Target } from "lucide-react";
import EarningsChart from "./EarningsChart";
import LeverCards from "./LeverCards";
import SessionLedger from "./SessionLedger";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  initialSessions: Session[];
  profile: TherapistProfile;
  payers: ReferencePayer[];
  sessionCodes: ReferenceSessionCode[];
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

export default function Dashboard({ initialSessions, profile, payers, sessionCodes }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  const isEmpty = sessions.length === 0;

  async function handleAdd(input: SessionInput) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ ...input, therapist_id: profile.id })
      .select("id, created_at, updated_at, session_datetime, amount, payment_option, session_code, appointment_type, state, session_descriptor, session_duration, payer")
      .single();
    if (error) { toast.error("Failed to save session."); return; }
    setSessions((prev) => [data as Session, ...prev]);
    toast.success("Session saved.");
  }

  async function handleUpdate(updated: Session) {
    const supabase = createSupabaseBrowserClient();
    const { session_datetime, amount, payment_option, session_code, appointment_type, state, session_descriptor, session_duration, payer } = updated;
    const { data, error } = await supabase
      .from("sessions")
      .update({ session_datetime, amount, payment_option, session_code, appointment_type, state, session_descriptor, session_duration, payer })
      .eq("id", updated.id)
      .select("id, created_at, updated_at, session_datetime, amount, payment_option, session_code, appointment_type, state, session_descriptor, session_duration, payer")
      .single();
    if (error) { toast.error("Failed to update session."); return; }
    setSessions((prev) => prev.map((s) => (s.id === data.id ? data as Session : s)));
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
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <EarningsChart sessions={sessions} profile={profile} />
        </CardContent>
      </Card>

      <LeverCards sessions={sessions} profile={profile} />

      <Separator />

      <SessionLedger
        sessions={sessions}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        payers={payers}
        sessionCodes={sessionCodes}
      />
    </div>
  );
}
