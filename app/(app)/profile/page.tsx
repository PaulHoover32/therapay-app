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
        <p className="text-sm text-muted-foreground">
          Annual income target · Target weekly sessions · Target avg payout — managed in <a href="/planner" className="underline">Planner</a>
        </p>
      </section>

      {/* Account */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Account</p>
        <p className="text-sm text-muted-foreground">Name · Password · Logout — coming soon</p>
      </section>
    </div>
  );
}
