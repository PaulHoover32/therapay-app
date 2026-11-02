"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { AiConnection } from "@/lib/connections"

const POLL_MS = 4000

// Live "waiting → connected" indicator: flips once Claude or ChatGPT makes its first
// authenticated request to the MCP server.
export function ConnectionStatus({ initial }: { initial: AiConnection[] }) {
  const [connections, setConnections] = useState(initial)
  const connected = connections.filter((c) => c.connected)

  useEffect(() => {
    let stopped = false
    const tick = async () => {
      try {
        const res = await fetch("/api/connections", { cache: "no-store" })
        if (res.ok && !stopped) setConnections((await res.json()).connections)
      } catch {
        // Offline for a moment; try again next tick
      }
    }
    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick()
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [])

  if (connected.length) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
        <div className="space-y-1">
          <p className="font-medium">Connected to {connected.map((c) => c.name).join(" and ")}</p>
          <p className="text-sm text-muted-foreground">You&apos;re all set. Head back to your chat and try the prompt below.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">Waiting for Claude or ChatGPT…</p>
        <p className="text-sm text-muted-foreground">
          {connections.length
            ? "You approved the connection. It shows as connected once the app uses Therapay for the first time."
            : "Follow the steps below. This updates on its own as soon as Therapay is connected."}
        </p>
      </div>
    </div>
  )
}
