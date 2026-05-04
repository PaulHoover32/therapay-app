import IDELayout from "@/components/layout/IDELayout";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AppLayout(_: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isNewUser = false;
  if (user) {
    const { data } = await supabase
      .from("therapists")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .single();
    isNewUser = !data?.onboarding_completed_at;
  }

  return <IDELayout isNewUser={isNewUser} />;
}
