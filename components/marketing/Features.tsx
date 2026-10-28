const features = [
  {
    icon: "🔗",
    title: "Connect once",
    description:
      "Add Therapay as a connector in ChatGPT or Claude and sign in. Takes about two minutes.",
  },
  {
    icon: "🎙️",
    title: "Log sessions by chat or voice",
    description:
      "Tell your AI app the date, payer and amount. Therapay records it. Client names are never stored.",
  },
  {
    icon: "📈",
    title: "Ask about your income",
    description:
      "Totals, trends, payer mix, how this month compares to last. Answers come from your own session data.",
  },
]

export function Features() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Your AI app becomes your practice bookkeeper
        </h2>
        <p className="text-lg text-muted-foreground">
          Built for therapists on Headway, Alma, Grow and private pay who want
          clarity on their income without another app to learn.
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
