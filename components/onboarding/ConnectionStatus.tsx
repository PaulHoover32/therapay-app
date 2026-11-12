"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { AiConnection } from "@/lib/connections"

const POLL_MS = 4000

// Live "waiting → connected" indicator: flips once Claude or ChatGPT makes its first
// authenticated request to the MCP server. Connected looks like a lamp switching on (DESIGN.md).
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

  const on = connected.length > 0

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 transition-colors duration-400",
        on && "border-primary/40 bg-primary/10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-2 size-2.5 shrink-0 rounded-full transition-colors duration-400",
          on ? "bg-primary" : "bg-muted-foreground motion-safe:animate-pulse",
        )}
      />
      {on ? (
        <div className="space-y-1">
          <p className="font-medium">Connected to {connected.map((c) => c.name).join(" and ")}</p>
          <p className="text-sm text-muted-foreground">
            You&apos;re all set. Go back to your chat and try the first prompt below.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-medium">Waiting for Claude or ChatGPT…</p>
          <p className="text-sm text-muted-foreground">
            {connections.length
              ? "You approved the connection. It shows as connected once the app uses Therapay for the first time."
              : "Follow the steps below. This updates on its own as soon as Therapay is connected."}
          </p>
        </div>
      )}
    </div>
  )
}
