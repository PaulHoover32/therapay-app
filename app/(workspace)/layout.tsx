import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { listThreads } from "@/lib/threads";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: therapist }, threads] = await Promise.all([
    supabase.from("therapists").select("name, avatar_url").eq("user_id", user.id).maybeSingle(),
    listThreads(supabase, user.id),
  ]);

  return (
    <WorkspaceShell
      userId={user.id}
      name={therapist?.name || user.email || "You"}
      avatarUrl={therapist?.avatar_url ?? null}
      initialThreads={threads}
    >
      {children}
    </WorkspaceShell>
  );
}
