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
    <div className="flex flex-col min-h-svh">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <Link href="/" className="text-sm font-semibold">Therapay</Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm space-y-4">
          {fromConnector && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Sign in to connect Therapay to your AI app.
            </p>
          )}
          {error === "invalid_token" && (
            <p className="text-sm text-destructive">That link has expired or was already used. Sign in or request a new one.</p>
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
