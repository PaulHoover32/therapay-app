// Privacy shown as absence (DESIGN.md → Overview): fields Therapay doesn't have, then the ones it keeps.
const MISSING = ["Client name", "Session date", "Notes"]
const KEPT = [
  { label: "Payout", value: "$1,842.50", mono: true },
  { label: "Payer", value: "Headway" },
  { label: "Month", value: "October 2026" },
]

export function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-20 border-t">
      <div className="mx-auto grid max-w-5xl items-start gap-12 px-6 py-24 md:grid-cols-2">
        <div className="max-w-xl space-y-4">
          <h2 className="text-3xl sm:text-[2.1rem] leading-tight">Therapay has no box for your clients.</h2>
          <p className="text-muted-foreground">
            It can&apos;t leak what it never asks for. There is nowhere to type a client&apos;s name, a session date or
            a note, and imports that look like per-session records are turned away. It keeps how much you were paid, who
            paid you, and for which month.
          </p>
          <p className="text-muted-foreground">
            For planning it also keeps your rates per payer and CPT code, and how many sessions you did each month.
            Those are totals, never appointments.
          </p>
        </div>

        <dl className="grid gap-2.5" aria-label="What Therapay stores">
          {MISSING.map((name) => (
            <div key={name} className="grid items-center gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground line-through">{name}</dt>
              <dd className="relative h-10 rounded-md border border-dashed">
                <span className="sr-only">Not collected</span>
                <span aria-hidden className="absolute inset-x-2 top-1/2 border-t border-muted-foreground/50" />
              </dd>
            </div>
          ))}
          {KEPT.map((f) => (
            <div key={f.label} className="grid items-center gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
              <dt>{f.label}</dt>
              <dd className={f.mono ? "rounded-md border bg-card px-3 py-2 font-mono tabular-nums" : "rounded-md border bg-card px-3 py-2"}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
