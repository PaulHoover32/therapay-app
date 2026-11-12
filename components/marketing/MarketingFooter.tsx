import Link from "next/link"

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Therapay. For independent therapists. Never stores client details.
        </p>
        <nav className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  )
}
