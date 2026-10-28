"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (e.g. insecure context): the URL is still selectable
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-1.5 pl-3">
      <code className="min-w-0 flex-1 truncate font-mono text-sm select-all">{value}</code>
      <Button type="button" size="sm" variant="secondary" onClick={copy} aria-label="Copy connector URL">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}
