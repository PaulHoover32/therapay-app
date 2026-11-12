import { headers } from "next/headers"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyField } from "@/components/onboarding/CopyField"
import { ConnectionStatus } from "@/components/onboarding/ConnectionStatus"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { listConnections } from "@/lib/connections"

const FIRST_PROMPT = "Set up Therapay"

async function connectorUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/mcp`
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}/api/mcp`
}

// Neither app supports a deep link that pre-fills a custom connector, so each path opens the
// right settings page and walks through the dialog. Our auth server supports Dynamic Client
// Registration (not Client ID Metadata Documents), hence "Register automatically" in Claude.
const APPS = [
  {
    name: "Claude",
    href: "https://claude.ai/customize/connectors",
    note: "Works on every Claude plan, including Free.",
    steps: [
      "Open Claude and go to Customize → Connectors, then click Add custom connector.",
      "Name it Therapay and paste the connector URL above.",
      "If Claude asks how to identify itself, choose Register automatically.",
      "Click Add, then Connect. You'll see a Therapay screen: click Allow.",
    ],
  },
  {
    name: "ChatGPT",
    href: "https://chatgpt.com/plugins",
    note: "Your plan or workspace settings may need to allow custom MCP servers.",
    steps: [
      "Open ChatGPT Plugins, click +, then Add custom MCP server.",
      "Name it Therapay and paste the connector URL above.",
      "For authentication choose OAuth, accept the warning, then Create as a plugin.",
      "Sign in when asked. You'll see a Therapay screen: click Allow.",
    ],
  },
]

export default async function ConnectPage() {
  const url = await connectorUrl()
  const supabase = await createSupabaseServerClient()
  const connections = await listConnections(supabase)

  return (
    <div className="w-full max-w-3xl space-y-12">
      <div className="max-w-xl space-y-3">
        <h1 className="text-4xl leading-tight">Connect Therapay</h1>
        <p className="text-muted-foreground">
          Add Therapay to Claude or ChatGPT. You&apos;re already signed in, so connecting is one click to approve, with
          no key to copy.
        </p>
      </div>

      <ConnectionStatus initial={connections} />

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl">Connector URL</h2>
          <p className="text-sm text-muted-foreground">The same URL works in both apps.</p>
        </div>
        <CopyField value={url} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Add it to your app</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {APPS.map((app) => (
            <Card key={app.name} className="shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-lg font-medium">{app.name}</CardTitle>
                <CardDescription>{app.note}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground marker:text-foreground">
                  {app.steps.map((step) => (
                    <li key={step} className="pl-1">{step}</li>
                  ))}
                </ol>
                <Button asChild variant="outline" className="w-full">
                  <a href={app.href} target="_blank" rel="noopener noreferrer">
                    Open {app.name} <ExternalLink className="size-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t pt-10">
        <div className="space-y-1">
          <h2 className="text-xl">Then try your first prompt</h2>
          <p className="text-sm text-muted-foreground">
            In a new chat (in Claude, turn Therapay on from the + menu), pick the &ldquo;Set up Therapay&rdquo; prompt or
            just say:
          </p>
        </div>
        <CopyField value={FIRST_PROMPT} label="Copy first prompt" />
      </section>

      <p className="rounded-lg bg-tide/10 px-4 py-3 text-sm">
        Never mention client names to your AI app. Therapay stores your profile, payouts and planning numbers only, never
        session or client details.
      </p>
    </div>
  )
}
