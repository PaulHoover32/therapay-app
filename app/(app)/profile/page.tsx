import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import SignOutButton from "@/components/profile/SignOutButton";
import AvatarUpload from "@/components/profile/AvatarUpload";
import AssistantCTA from "@/components/AssistantCTA";

function formatMemberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: therapist } = user
    ? await supabase
        .from("therapists")
        .select("name, avatar_url, specialties, years_licensed, license_type, practice_model, states")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const name = therapist?.name ?? "";
  const email = user?.email ?? "";
  const memberSince = user?.created_at ? formatMemberSince(user.created_at) : null;
  const specialties = therapist?.specialties
    ? therapist.specialties.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const infoFields = [
    { label: "Years Licensed", value: therapist?.years_licensed != null ? `${therapist.years_licensed} years` : null },
    { label: "License Type",   value: therapist?.license_type ?? null },
    { label: "Practice Model", value: therapist?.practice_model ?? null },
    { label: "States",         value: therapist?.states?.length ? therapist.states.join(", ") : null },
  ];

  const hasPracticeInfo = specialties.length > 0 || infoFields.some((f) => f.value !== null);

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and practice details.</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <AvatarUpload
              userId={user?.id ?? ""}
              name={name}
              avatarUrl={therapist?.avatar_url ?? null}
            />
            <div>
              <p className="font-semibold text-base">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              {memberSince && (
                <p className="text-xs text-muted-foreground mt-0.5">Member since {memberSince}</p>
              )}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Change your email or reset your password</p>
            <AssistantCTA starter="I want to update my account — email or password" label="Update with Assistant" />
          </div>
          <Separator />
          <SignOutButton />
        </CardContent>
      </Card>

      {/* Practice Info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Practice Info</CardTitle>
            <CardDescription className="mt-1">
              {hasPracticeInfo
                ? "Your credentials and practice details."
                : "Let the Assistant look you up and fill this in."}
            </CardDescription>
          </div>
          <AssistantCTA
            starter="Help me set up my practice profile — search for my information online and help me fill in my specialties and years licensed"
            label="Set up with Assistant"
          />
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Specialties — badge layout */}
          <div className="py-3 border-b border-border">
            <p className="text-sm text-muted-foreground mb-2">Specialties</p>
            {specialties.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {specialties.map((s: string) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/40">—</span>
            )}
          </div>

          {/* Other fields — horizontal rows */}
          <div className="divide-y divide-border">
            {infoFields.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={value ? "text-sm font-medium" : "text-sm text-muted-foreground/40"}>
                  {value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
