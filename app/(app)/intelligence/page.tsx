import { getTherapistProfile, getSessionLogs } from "@/lib/data";

export default async function IntelligencePage() {
  const [profile, sessions] = await Promise.all([
    getTherapistProfile(),
    getSessionLogs(),
  ]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deep analytics for {profile.name} · {sessions.length} sessions loaded
        </p>
      </div>

      {/* Top bar */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Filters</p>
        <p className="text-sm text-muted-foreground">Date range · Granularity · Filters · Compare toggle</p>
      </section>

      {/* Trajectory */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Trajectory</p>
        <p className="text-sm text-muted-foreground">Earnings trajectory chart — coming soon</p>
      </section>

      {/* Refinement */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Refinement</p>
        <p className="text-sm text-muted-foreground">Payer mix, session type breakdown — coming soon</p>
      </section>

      {/* Velocity Modules */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Velocity Modules</p>
        <p className="text-sm text-muted-foreground">Revenue, session, and hours velocity — coming soon</p>
      </section>

      {/* Comparative Performance */}
      <section className="rounded-lg border border-dashed border-border p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Comparative Performance</p>
        <p className="text-sm text-muted-foreground">Period-over-period and peer benchmarks — coming soon</p>
      </section>
    </div>
  );
}
