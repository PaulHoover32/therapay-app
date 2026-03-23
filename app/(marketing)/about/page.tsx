import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-32">
      <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
        Built for therapists,
        <br />
        by people who care.
      </h1>

      <div className="space-y-6 text-muted-foreground">
        <p className="text-lg leading-relaxed">
          Therapay was built because independent therapists deserve better tools.
          1099 practitioners spend too much time hunting through spreadsheets and
          bank statements to understand what they actually earned last month — time
          that should be spent with clients or recovering between sessions.
        </p>

        <p className="leading-relaxed">
          We built Therapay to give therapists a single, clear picture of their
          income: what came in, what&apos;s projected, and how their practice is
          trending over time. No accounting background required.
        </p>

        <p className="leading-relaxed">
          Therapay is currently in early access. We&apos;re actively building new
          features based on feedback from real practitioners. If you have thoughts
          on what would make your practice easier to run, we want to hear from you.
        </p>
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-8">
        <h2 className="mb-2 text-xl font-semibold">Ready to get started?</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Try Therapay free — no credit card required.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing">See Pricing</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
