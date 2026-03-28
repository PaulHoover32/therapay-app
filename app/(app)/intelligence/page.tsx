import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Session, TherapistProfile, ReferencePayer, ReferenceSessionCode } from "@/lib/types";
import IncomeAnalysis from "@/components/intelligence/IncomeAnalysis";

function enrichSessions(
  sessions: Record<string, unknown>[],
  sessionCodes: ReferenceSessionCode[],
  payers: ReferencePayer[],
): Session[] {
  return sessions.map((s) => {
    const code = sessionCodes.find((c) => c.code === s.session_code);
    const payerRef = payers.find((p) => p.name === s.payer);
    return {
      ...s,
      appointment_type: code?.appointment_type ?? "individual",
      session_duration: code?.session_duration ?? 0,
      payment_option: payerRef?.payment_option ?? "insurance",
    };
  }) as unknown as Session[];
}

export default async function IntelligencePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: therapist } = await supabase
    .from("therapists")
    .select("id, name, avg_session_duration")
    .eq("user_id", user.id)
    .single();

  if (!therapist) redirect("/login");

  const [{ data: sessions }, { data: payers }, { data: sessionCodes }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, created_at, updated_at, session_datetime, amount, session_code, state, payer")
      .eq("therapist_id", therapist.id)
      .order("session_datetime", { ascending: true }),
    supabase
      .from("reference_payers")
      .select("id, name, payment_option")
      .eq("active", true),
    supabase
      .from("reference_session_codes")
      .select("code, appointment_type, session_duration, description")
      .eq("active", true),
  ]);

  const enriched = enrichSessions(
    (sessions ?? []) as unknown as Record<string, unknown>[],
    (sessionCodes ?? []) as ReferenceSessionCode[],
    (payers ?? []) as ReferencePayer[],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Multi-year income analysis for {therapist.name}
        </p>
      </div>
      <IncomeAnalysis sessions={enriched} profile={therapist as unknown as TherapistProfile} />
    </div>
  );
}
