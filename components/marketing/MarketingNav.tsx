import Link from "next/link"
import { Button } from "@/components/ui/button"

const LINKS = [
  { href: "/#privacy", label: "Privacy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
]

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-xl font-medium">
            Therapay
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </header>
  )
}
