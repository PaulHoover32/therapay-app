import { getTherapistProfile } from "@/lib/data";

export default async function ProfilePage() {
  const profile = await getTherapistProfile();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">{profile.name}</p>
      </div>

      {/* Practice Info */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Practice Info</p>
        <p className="text-sm text-muted-foreground">
          Licensure type · Years licensed · Practice model · Specialties · Zip code — coming soon
        </p>
      </section>

      {/* Financial Targets */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Financial Targets</p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Annual goal: ${profile.annual_goal.toLocaleString()}</p>
          <p>Target weekly sessions: {profile.target_weekly_sessions}</p>
          <p>Target avg payout — coming soon</p>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Account</p>
        <p className="text-sm text-muted-foreground">Name · Password · Logout — coming soon</p>
      </section>
    </div>
  );
}
