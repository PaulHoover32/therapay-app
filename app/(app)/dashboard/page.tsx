import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Session, TherapistProfile, ReferencePayer, ReferenceSessionCode } from "@/lib/types";
import Dashboard from "@/components/Dashboard";
import NavBar from "@/components/NavBar";
import { Toaster } from "@/components/ui/sonner";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: therapist } = await supabase
    .from("therapists")
    .select("id, name, annual_goal, target_weekly_sessions, avg_session_duration")
    .eq("user_id", user.id)
    .single();

  if (!therapist) redirect("/login");

  const [{ data: sessions }, { data: payers }, { data: sessionCodes }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, created_at, updated_at, session_datetime, amount, payment_option, session_code, appointment_type, state, session_descriptor, session_duration, payer")
      .eq("therapist_id", therapist.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reference_payers")
      .select("id, name, payment_option")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("reference_session_codes")
      .select("code, appointment_type, session_duration, description")
      .eq("active", true)
      .order("code"),
  ]);

  return (
    <>
      <NavBar name={therapist.name} />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Dashboard
            initialSessions={(sessions ?? []) as unknown as Session[]}
            profile={therapist as unknown as TherapistProfile}
            payers={(payers ?? []) as ReferencePayer[]}
            sessionCodes={(sessionCodes ?? []) as ReferenceSessionCode[]}
          />
        </div>
      </main>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
