import Link from "next/link"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Get started tracking your sessions at no cost.",
    features: [
      "Up to 20 sessions/month",
      "Basic earnings tracking",
      "Session ledger",
    ],
    cta: "Get Started",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    description: "Everything you need to run a full independent practice.",
    features: [
      "Unlimited sessions",
      "Income projections",
      "Export to CSV",
      "Priority support",
    ],
    cta: "Start Free Trial",
    variant: "default" as const,
    highlighted: true,
  },
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, honest pricing
        </h1>
        <p className="text-lg text-muted-foreground">
          No hidden fees. No confusing tiers. Just tools that help you earn
          more.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border p-8 ${
              plan.highlighted
                ? "border-primary bg-card"
                : "border-border bg-card"
            }`}
          >
            {plan.highlighted && (
              <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most popular
              </span>
            )}
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className="text-muted-foreground">{plan.period}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {plan.description}
            </p>

            <ul className="my-6 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Button asChild variant={plan.variant} className="w-full">
              <Link href="/login">{plan.cta}</Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Questions?{" "}
        <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
          Learn more about Therapay
        </Link>
      </p>
    </div>
  )
}
