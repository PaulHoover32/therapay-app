"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function DeleteAccountButton({ action }: { action: () => Promise<{ error: string } | void> }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-destructive/45 text-destructive hover:bg-destructive/10 hover:text-destructive">
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-medium">Delete your Therapay account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your profile, payouts, imports, rate card, monthly counts and goals, and disconnects
            Claude and ChatGPT. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            className="border-destructive/45 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action()
                if (result?.error) setError(result.error)
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete everything
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
