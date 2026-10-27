"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useMlStatus } from "@/lib/voice/ml-client";

// Shown above the composer while the on-device name filter downloads (first visit only)
export default function PrivacyFilterStatus() {
  const { ner, nerProgress, error } = useMlStatus();

  if (ner === "error") {
    return (
      <p className="mb-2 flex items-center gap-1.5 text-xs text-destructive">
        <ShieldAlert className="size-3.5" />
        The privacy filter couldn&apos;t load, so sending is paused. Reload to try again.
        {error && <span className="sr-only">{error}</span>}
      </p>
    );
  }
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="size-3.5" />
      Preparing privacy filter{nerProgress > 0 && nerProgress < 100 ? ` · ${Math.round(nerProgress)}%` : "…"}
    </p>
  );
}
