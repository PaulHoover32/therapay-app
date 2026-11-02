import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { safeNext } from "@/lib/safe-next"

// The one front door: sign-up and sign-in for the website and for Claude/ChatGPT connectors.
// The OAuth consent page sends logged-out users here with ?next=/oauth/consent?authorization_id=...
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  const fromConnector = next?.startsWith("/oauth/consent") ?? false

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <Link href="/" className="text-sm font-semibold">Therapay</Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {fromConnector ? "Sign in to connect Therapay" : "Get started with Therapay"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {fromConnector
                ? "Use the same account you signed up with. You'll approve the connection next."
                : "Track your earnings by talking to Claude or ChatGPT. Free, and set up in two minutes."}
            </p>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
              {error === "invalid_token"
                ? "That link has expired or was already used. Request a new one below."
                : "Sign-in didn't finish. Please try again."}
            </p>
          )}
          <LoginForm next={next ? safeNext(next) : undefined} />
          <p className="text-center text-xs text-muted-foreground">
            New here? Any option above creates your account. No password needed.
          </p>
        </div>
      </main>
    </div>
  )
}
