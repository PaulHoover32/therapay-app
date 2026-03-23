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
          For independent 1099 therapists
        </span>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Know exactly what
          <br />
          you earn.{" "}
          <span className="text-muted-foreground">Every session.</span>
        </h1>

        <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
          Therapay tracks your sessions, projects your income, and shows you
          exactly where your earnings are heading — so you can focus on your
          clients, not your spreadsheets.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">Get Started</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-10 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <span>See what&apos;s inside</span>
        <div className="h-5 w-px bg-border" />
      </div>
    </section>
  )
}
