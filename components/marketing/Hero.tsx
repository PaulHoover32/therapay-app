import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
      {/* Subtle radial glow behind the headline */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, oklch(0.488 0.243 264.376 / 12%) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-3xl">
        <span className="mb-6 inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          For independent 1099 therapists · Works in ChatGPT and Claude
        </span>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Track your earnings
          <br />
          <span className="text-muted-foreground">by just talking.</span>
        </h1>

        <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
          Connect Therapay to the AI app you already use. Say &ldquo;log a session from today, I made
          $150&rdquo; and it&apos;s recorded. Ask &ldquo;how am I doing this month?&rdquo; and get the
          answer from your own numbers. No new app, no spreadsheets.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login?mode=signup">Get started</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-10 hidden flex-col items-center gap-2 text-xs text-muted-foreground sm:flex">
        <span>How it works</span>
        <div className="h-5 w-px bg-border" />
      </div>
    </section>
  )
}
