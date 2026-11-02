import Link from "next/link"
import { Button } from "@/components/ui/button"

export function MarketingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Therapay
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
          </nav>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    </header>
  )
}
