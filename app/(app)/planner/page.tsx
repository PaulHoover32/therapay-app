import { getTherapistProfile } from "@/lib/data";

export default async function PlannerPage() {
  const profile = await getTherapistProfile();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Planner</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Goal: ${profile.annual_goal.toLocaleString()} · {profile.target_weekly_sessions} sessions / wk
        </p>
      </div>

      {/* Goal-Setting Wizard */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Goal-Setting Wizard</p>
        <p className="text-sm text-muted-foreground">Annual income goal, session targets, payer mix targets — coming soon</p>
      </section>

      {/* Scenario Summary */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Scenario Summary</p>
        <p className="text-sm text-muted-foreground">Projected outcomes based on current settings — coming soon</p>
      </section>

      {/* AI Recommendations */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">AI Recommendations</p>
        <p className="text-sm text-muted-foreground">Personalized suggestions to close the gap — coming soon</p>
      </section>
    </div>
  );
}
