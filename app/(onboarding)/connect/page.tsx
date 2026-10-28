import { headers } from "next/headers"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyField } from "@/components/onboarding/CopyField"

async function connectorUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/mcp`
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}/api/mcp`
}

const APPS = [
  {
    name: "Claude",
    href: "https://claude.ai/settings/connectors",
    steps: [
      "Open Claude and go to Settings → Connectors.",
      "Choose Add custom connector, name it Therapay, and paste the URL above.",
      "Click Connect, then sign in with your Therapay account and choose Allow.",
      "In a chat, turn on Therapay from the tools menu and say “log a session from today, I made $150.”",
    ],
  },
  {
    name: "ChatGPT",
    href: "https://chatgpt.com/#settings/Connectors",
    steps: [
      "Open ChatGPT and go to Settings → Apps & Connectors → Advanced, and turn on Developer mode.",
      "Back in Apps & Connectors, choose Create, name it Therapay, paste the URL above and pick OAuth.",
      "Sign in with your Therapay account when asked and choose Allow.",
      "In a new chat, add Therapay from the + menu and ask “how much did I earn this month?”",
    ],
  },
]

export default async function ConnectPage() {
  const url = await connectorUrl()

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Connect Therapay to your AI app</h1>
        <p className="text-muted-foreground">
          Add this URL as a connector in Claude or ChatGPT. You&apos;ll sign in once, then log sessions and ask about
          your income right in the chat, by typing or by voice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your connector URL</CardTitle>
          <CardDescription>The same URL works in both apps.</CardDescription>
        </CardHeader>
        <CardContent>
          <CopyField value={url} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {APPS.map((app) => (
          <Card key={app.name}>
            <CardHeader>
              <CardTitle className="text-base">{app.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {app.steps.map((step) => (
                  <li key={step}>{step}</li>
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

      <p className="text-sm text-muted-foreground">
        Never mention client names to your AI app when logging sessions. Therapay only records the date, amount,
        session code, payer and state.
      </p>
    </div>
  )
}
