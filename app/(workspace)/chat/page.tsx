import { randomUUID } from "crypto";
import Conversation from "@/components/conversation/Conversation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// "Dr. Sarah Chen" → "Sarah", "Marcus Rivera, LCSW" → "Marcus"
function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.replace(/^(dr|mr|mrs|ms|mx)\.?\s+/i, "").split(/[\s,]+/)[0];
  return first || null;
}

export default async function NewChatPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: therapist } = await supabase
    .from("therapists")
    .select("name, onboarding_completed_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  const id = randomUUID();
  return (
    <Conversation
      key={id}
      id={id}
      isNew
      initialMessages={[]}
      firstName={firstNameOf(therapist?.name)}
      isNewUser={!therapist?.onboarding_completed_at}
    />
  );
}
