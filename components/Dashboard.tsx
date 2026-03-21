"use client";

import { useState } from "react";
import { Session, TherapistProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, UserCircle, PlusCircle, Target } from "lucide-react";
import EarningsChart from "./EarningsChart";
import LeverCards from "./LeverCards";
import SessionLedger from "./SessionLedger";
import SessionForm from "./SessionForm";
import Link from "next/link";

interface Props {
  initialSessions: Session[];
  profile: TherapistProfile;
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
              <p className="text-xs text-muted-foreground">Use the form below the chart.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ initialSessions, profile }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [formOpen, setFormOpen] = useState(false);

  const isEmpty = sessions.length === 0;

  function handleAdd(session: Session) {
    setSessions((prev) =>
      [...prev, session].sort(
        (a, b) => new Date(b.session_datetime).getTime() - new Date(a.session_datetime).getTime()
      )
    );
  }

  function handleUpdate(updated: Session) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleDelete(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      {/* Hero Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <EarningsChart sessions={sessions} profile={profile} />
        </CardContent>
      </Card>

      {/* Financial Lever Cards */}
      <LeverCards sessions={sessions} profile={profile} />

      <Separator />

      {/* Session Input Form */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Add Session</h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              {formOpen ? (
                <>Collapse <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Expand <ChevronDown className="w-4 h-4" /></>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-4">
              <SessionForm sessions={sessions} onAdd={handleAdd} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Session Ledger */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Session Ledger
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({sessions.length} sessions)
            </span>
          </h2>
        </div>
        <SessionLedger
          sessions={sessions}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      </div>
    </div>
  );
}
