import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { decideAuthorization } from "./actions"

// Supabase Auth's OAuth 2.1 server sends the browser here (?authorization_id=...) when Claude or
// ChatGPT asks to connect. Set this path as the authorization URL in Supabase → Auth → OAuth Server.
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; error?: string }>
}) {
  const { authorization_id: authorizationId, error: decisionFailed } = await searchParams
  if (!authorizationId) return <Shell title="Missing request" body="This link is missing its authorization request. Start connecting again from Claude or ChatGPT." />

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const here = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
    redirect(`/login?next=${encodeURIComponent(here)}`)
  }

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
  if (error || !data) return <Shell title="Request expired" body="This connection request is no longer valid. Start connecting again from Claude or ChatGPT." />
  // Already approved earlier: go straight back to the client
  if (!("authorization_id" in data)) redirect(data.redirect_url)

  const clientName = data.client.name || "An AI app"
  let callbackHost = data.redirect_uri
  try { callbackHost = new URL(data.redirect_uri).host } catch {}

  return (
    <Shell>
      <Card className="w-full max-w-sm shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-medium leading-tight">Connect {clientName} to Therapay?</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{clientName} will be able to:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Read and update your practice profile</li>
            <li>Import and read your payouts (deposits from Grow, Headway, Stripe…)</li>
            <li>Answer questions about your income from those payouts</li>
          </ul>
          <p className="text-muted-foreground">
            It can&apos;t see client names: Therapay doesn&apos;t have them. You can disconnect any time from your
            Therapay account or {clientName}&apos;s settings.
          </p>
          <p className="text-xs text-muted-foreground">You&apos;ll be sent back to {callbackHost}.</p>
          {decisionFailed && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2">Something went wrong. Please try again.</p>}
        </CardContent>
        <CardFooter>
          <form action={decideAuthorization} className="flex w-full gap-2">
            <input type="hidden" name="authorization_id" value={data.authorization_id} />
            <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">Cancel</Button>
            <Button type="submit" name="decision" value="approve" className="flex-1">Allow</Button>
          </form>
        </CardFooter>
      </Card>
    </Shell>
  )
}

function Shell({ title, body, children }: { title?: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center border-b px-6">
        <span className="font-display text-lg font-medium">Therapay</span>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 py-12 md:items-center md:py-16">
        {children ?? (
          <div className="max-w-sm space-y-3">
            <h1 className="text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        )}
      </main>
    </div>
  )
}
