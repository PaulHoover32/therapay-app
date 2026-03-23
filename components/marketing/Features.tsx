const features = [
  {
    icon: "💰",
    title: "Session Earnings Tracking",
    description:
      "Log every session and see your income broken down by client, rate, and date. No more end-of-month surprises.",
  },
  {
    icon: "📈",
    title: "Income Projections",
    description:
      "Therapay forecasts your monthly and annual earnings based on your current pace — so you always know where you stand.",
  },
  {
    icon: "📋",
    title: "Clean Session Ledger",
    description:
      "A full history of every session you've logged, filterable and always at your fingertips. Your practice, organized.",
  },
]

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to run your practice
        </h2>
        <p className="text-lg text-muted-foreground">
          Built specifically for independent therapists who want clarity on
          their finances.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-8"
          >
            <div className="mb-4 text-3xl">{feature.icon}</div>
            <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
