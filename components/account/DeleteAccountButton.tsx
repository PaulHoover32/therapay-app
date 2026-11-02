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
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your Therapay account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your profile, sessions, payouts, goals and imports, and disconnects Claude and
            ChatGPT. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
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
