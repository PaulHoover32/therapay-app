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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connect {clientName} to Therapay?</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{clientName} will be able to:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Read and update your practice profile</li>
            <li>Log sessions and the amounts you earned</li>
            <li>Read your logged sessions to answer questions about your income</li>
          </ul>
          <p className="text-muted-foreground">
            Therapay never stores client names. You can disconnect any time from {clientName}&apos;s settings.
          </p>
          <p className="text-xs text-muted-foreground">You&apos;ll be sent back to {callbackHost}.</p>
          {decisionFailed && <p className="text-destructive">Something went wrong. Please try again.</p>}
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
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <span className="text-sm font-semibold">Therapay</span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        {children ?? (
          <div className="max-w-sm space-y-2 text-center">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        )}
      </main>
    </div>
  )
}
