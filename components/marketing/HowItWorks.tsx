import Link from "next/link"
import { Button } from "@/components/ui/button"

const STEPS = [
  "Create your Therapay account here.",
  "Add Therapay as a connector in Claude or ChatGPT, then click Allow.",
  "Hand it your payout export and ask your first question.",
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-24 md:grid-cols-2">
        <div className="max-w-xl space-y-6">
          <h2 className="text-3xl sm:text-[2.1rem] leading-tight">About two minutes to connect</h2>
          <ol className="list-decimal space-y-3 pl-6 marker:font-display marker:text-primary">
            {STEPS.map((step) => (
              <li key={step} className="pl-2">
                {step}
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground">
            No new app to learn. You keep talking to the assistant you already use, and it does the bookkeeping.
          </p>
        </div>

        <div className="max-w-md space-y-4 md:pt-2">
          <h3 className="text-xl">Things therapists ask it</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>&ldquo;Am I on track to beat last year?&rdquo;</li>
            <li>&ldquo;Which payer pays me the most per session?&rdquo;</li>
            <li>&ldquo;How many more sessions a month would close the gap?&rdquo;</li>
          </ul>
          <div className="pt-4">
            <Button asChild>
              <Link href="/login?mode=signup">Create your account</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
