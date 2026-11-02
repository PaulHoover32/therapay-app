import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteAccountButton } from "@/components/account/DeleteAccountButton"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { listConnections } from "@/lib/connections"
import { deleteAccount, disconnectApp, signOut } from "./actions"

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  azure: "Microsoft",
  email: "Email and password",
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/account")

  const connections = await listConnections(supabase)
  const methods = [...new Set((user.identities ?? []).map((i) => PROVIDER_LABELS[i.provider] ?? i.provider))]

  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Signs in with</span>
            <span className="flex flex-wrap gap-1.5">
              {methods.map((m) => (
                <Badge key={m} variant="secondary">
                  {m}
                </Badge>
              ))}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected AI apps</CardTitle>
          <CardDescription>Apps you&apos;ve allowed to read and log your Therapay data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              None yet.{" "}
              <Link href="/connect" className="text-foreground underline">
                Connect Claude or ChatGPT
              </Link>
            </p>
          )}
          {connections.map((c) => (
            <div key={c.clientId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.lastSeenAt
                    ? `Last used ${formatDate(c.lastSeenAt)}`
                    : c.grantedAt
                      ? `Approved ${formatDate(c.grantedAt)}, not used yet`
                      : "Not used yet"}
                </p>
              </div>
              <form action={disconnectApp}>
                <input type="hidden" name="clientId" value={c.clientId} />
                <Button type="submit" variant="outline" size="sm">
                  Disconnect
                </Button>
              </form>
            </div>
          ))}
          {connections.length > 0 && (
            <Link href="/connect" className="inline-block text-sm text-muted-foreground underline hover:text-foreground">
              Connect another app
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
        <DeleteAccountButton action={deleteAccount} />
      </div>
    </div>
  )
}
