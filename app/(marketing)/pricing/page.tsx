import Link from "next/link"
import { Button } from "@/components/ui/button"

const MONTHLY = 20
const ANNUAL = MONTHLY * 11

const INCLUDED = [
  "Payout imports from Stripe, Headway, Alma and Grow exports",
  "“Am I on track?” check-ins with a seasonal projection to December",
  "A rate card per payer and CPT code, so options are priced in real dollars",
  "A yearly goal as a dollar target or a growth percentage",
  "Works in Claude (every plan, including Free) and ChatGPT",
  "Delete everything, any time, from your account page",
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-16 md:pt-24">
      <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="max-w-xl space-y-6">
          <h1 className="text-[2.4rem] leading-[1.08] sm:text-5xl">One plan, priced like a co-pay.</h1>
          <p className="text-lg text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">${MONTHLY}</span> a month, or{" "}
            <span className="font-mono tabular-nums text-foreground">${ANNUAL}</span> a year, which is one month free.
            Everything is included and you can cancel any time.
          </p>
          <Button asChild size="lg">
            <Link href="/login?mode=signup">Create your account</Link>
          </Button>
        </div>

        <div className="space-y-4 md:border-l md:pl-10 max-md:border-t max-md:pt-10">
          <h2 className="text-xl">What you get</h2>
          <ul className="space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-20 border-t pt-8 text-sm text-muted-foreground">
        Therapay never stores client names, session dates or notes, on any plan.{" "}
        <Link href="/about" className="text-tide underline underline-offset-4 hover:text-foreground">
          Who&apos;s behind it
        </Link>
      </p>
    </div>
  )
}
