"use client";

import { Button } from "@/components/ui/button";

const STARTERS = [
  "How am I doing this year?",
  "Show my payer mix",
  "Help me set an income goal",
  "Show my recent sessions",
];

const NEW_USER_STARTERS = [
  "Set up my practice profile",
  "How do I log a session?",
  "Help me set an income goal",
  "What can you do?",
];

interface Props {
  firstName: string | null;
  isNewUser: boolean;
  onStarter: (text: string) => void;
}

export default function EmptyState({ firstName, isNewUser, onStarter }: Props) {
  const starters = isNewUser ? NEW_USER_STARTERS : STARTERS;
  return (
    <div className="my-auto flex flex-col gap-6 py-10">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Hi ${firstName}.` : "Hi there."} What would you like to look at?
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask about your earnings, sessions, goals, or practice. Please don&apos;t mention client names.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {starters.map((s) => (
          <Button
            key={s}
            variant="outline"
            className="h-auto justify-start rounded-2xl px-4 py-3 text-left text-sm font-normal whitespace-normal"
            onClick={() => onStarter(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
