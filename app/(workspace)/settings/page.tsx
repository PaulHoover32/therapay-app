import { createSupabaseServerClient } from "@/lib/supabase-server";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import AvatarField from "@/components/settings/AvatarField";
import EmailField from "@/components/settings/EmailField";
import PasswordReset from "@/components/settings/PasswordReset";
import ThemePicker from "@/components/settings/ThemePicker";
import SettingsSection from "@/components/settings/SettingsSection";
import UsageSummary from "@/components/settings/UsageSummary";
import { getDailyUsage } from "@/lib/usage";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: therapist }, usage] = await Promise.all([
    supabase.from("therapists").select("name, avatar_url").eq("user_id", user!.id).maybeSingle(),
    getDailyUsage(supabase, user!.id),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceHeader title="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
          <SettingsSection title="Profile photo">
            <AvatarField userId={user!.id} name={therapist?.name ?? ""} avatarUrl={therapist?.avatar_url ?? null} />
          </SettingsSection>
          <SettingsSection title="Email" description="We'll send a confirmation link to both your current and new address.">
            <EmailField currentEmail={user!.email ?? ""} />
          </SettingsSection>
          <SettingsSection title="Password" description="We'll email you a secure link to set a new password.">
            <PasswordReset email={user!.email ?? ""} />
          </SettingsSection>
          <SettingsSection title="Appearance">
            <ThemePicker />
          </SettingsSection>
          <SettingsSection title="Today's usage">
            <UsageSummary usage={usage} />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
