"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const features = [
  "Unlimited sessions",
  "Income projections & goal tracking",
  "AI-powered financial assistant",
  "Session ledger & payer breakdown",
  "Export to CSV",
  "Priority support",
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  const monthlyPrice = 20
  const annualPrice = Math.round((monthlyPrice * 11) / 12)

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, honest pricing
        </h1>
        <p className="text-lg text-muted-foreground">
          One plan. Everything you need to run an independent practice.
        </p>
      </div>

      <div className="mb-10 flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annual ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${annual ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
        <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
          Annual
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            1 month free
          </span>
        </span>
      </div>

      <div className="mx-auto max-w-sm">
        <div className="rounded-xl border border-primary bg-card p-8">
          <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            All features included
          </span>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-5xl font-bold">
              ${annual ? annualPrice : monthlyPrice}
            </span>
            <span className="text-muted-foreground">/mo</span>
          </div>

          {annual && (
            <p className="mt-1 text-sm text-muted-foreground">
              Billed ${monthlyPrice * 11}/yr — you save ${monthlyPrice}
            </p>
          )}
          {!annual && (
            <p className="mt-1 text-sm text-muted-foreground">
              Billed monthly, cancel anytime
            </p>
          )}

          <ul className="my-6 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>

          <Button asChild className="w-full">
            <Link href="/login">Get started</Link>
          </Button>
        </div>
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
