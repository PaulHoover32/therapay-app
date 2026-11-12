import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { safeNext } from "@/lib/safe-next"

// Shared sign-in for the website and for Claude/ChatGPT connectors: the OAuth consent page
// sends logged-out users here with ?next=/oauth/consent?authorization_id=...
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>
}) {
  const { next, mode, error } = await searchParams
  const fromConnector = next?.startsWith("/oauth/consent") ?? false

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/" className="font-display text-lg font-medium">Therapay</Link>
      </header>
      <div className="flex flex-1 items-start justify-center px-6 py-12 md:items-center md:py-16">
        <div className="w-full max-w-sm space-y-4">
          {fromConnector && (
            <p className="rounded-lg bg-tide/10 px-4 py-3 text-sm">
              Sign in to connect Therapay to your AI app.
            </p>
          )}
          {error === "invalid_token" && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm">
              That link has expired or was already used. Sign in or request a new one.
            </p>
          )}
          <LoginForm
            next={next ? safeNext(next) : undefined}
            initialMode={mode === "signup" ? "signup" : "signin"}
          />
        </div>
      </div>
    </div>
  )
}
