import Link from "next/link"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-medium">Therapay</Link>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/connect" className="transition-colors hover:text-foreground">Connect</Link>
          <Link href="/account" className="transition-colors hover:text-foreground">Account</Link>
        </nav>
      </header>
      <main className="flex flex-1 justify-center px-4 py-12 sm:px-6 md:py-16">{children}</main>
    </div>
  )
}
