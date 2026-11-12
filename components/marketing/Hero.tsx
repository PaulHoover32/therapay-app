import Link from "next/link"
import { Button } from "@/components/ui/button"
import { YearHorizon } from "@/components/marketing/YearHorizon"

export function Hero() {
  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_1fr] md:gap-14 md:pt-24">
      <div className="space-y-6">
        <h1 className="text-[2.4rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
          Know if your year is on track, without opening a spreadsheet.
        </h1>
        <p className="text-lg text-muted-foreground">
          Therapay connects to Claude or ChatGPT. Give it your payout history from Headway, Alma, Grow or Stripe, then
          ask in plain words. Your income comes from your deposits and nothing else.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button asChild size="lg">
            <Link href="/login?mode=signup">Create your account</Link>
          </Button>
          <Button asChild variant="link" size="lg" className="text-foreground underline">
            <Link href="#privacy">How it handles privacy</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">$20 a month. Works on every Claude plan, including Free.</p>
      </div>

      <figure className="border-border md:border-l md:pl-8 max-md:border-t max-md:pt-8">
        <figcaption className="sr-only">An example conversation with Therapay in Claude</figcaption>
        <p className="text-muted-foreground">
          You, in Claude
          <br />
          <span className="font-medium text-foreground">Am I on track this year?</span>
        </p>
        <p className="mt-5">
          You&apos;ve been paid <span className="font-mono tabular-nums">$71,400</span> for work through September. At
          your usual autumn pace you&apos;ll finish near <span className="font-mono tabular-nums">$84,000</span>, about{" "}
          <span className="font-mono tabular-nums">$6,000</span> short of your{" "}
          <span className="font-mono tabular-nums">$90,000</span> goal.
        </p>
        <YearHorizon />
        <p className="border-t border-dashed pt-4 text-[0.95rem]">
          Two more Headway sessions a week from now to December closes most of that gap.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Example figures.</p>
      </figure>
    </section>
  )
}
