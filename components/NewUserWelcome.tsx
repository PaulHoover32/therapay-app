"use client"

import { useState } from "react"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/store/chatStore"
import { createSupabaseBrowserClient } from "@/lib/supabase"

const SETUP_STARTER =
  "I'm new to Therapay! Help me fill out my practice profile — things like my license type, how I bill clients, and the states I practice in."

export default function NewUserWelcome({ userId }: { userId: string }) {
  const [dismissed, setDismissed] = useState(false)
  const triggerStarter = useChatStore((s) => s.triggerStarter)

  async function markComplete() {
    const supabase = createSupabaseBrowserClient()
    await supabase
      .from("therapists")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("user_id", userId)
  }

  async function handleGetStarted() {
    setDismissed(true)
    await markComplete()
    triggerStarter(SETUP_STARTER)
  }

  async function handleDismiss() {
    setDismissed(true)
    await markComplete()
  }

  if (dismissed) return null

  return (
    <div className="mx-4 mt-4 rounded-xl border border-violet-500/30 bg-violet-950/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Welcome to Therapay!</p>
            <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
              Your AI assistant can set up your practice profile, analyze your earnings, and help you hit your income goals — all in one conversation.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-violet-600 hover:bg-violet-500 text-white"
              onClick={handleGetStarted}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Set up with the Therapay assistant
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
