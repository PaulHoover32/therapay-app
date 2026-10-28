import Link from "next/link"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <Link href="/" className="text-sm font-semibold">Therapay</Link>
      </header>
      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">{children}</main>
    </div>
  )
}
