"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { US_STATES } from "@/lib/privacy/config";

// Words that look like names but must reach the assistant: the therapist's own name,
// payer names, and US states. Platform names are added inside the worker.
export function usePrivacyAllowlist(therapistName: string | null): string[] {
  const [payers, setPayers] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("reference_payers")
      .select("name")
      .then(({ data }) => setPayers((data ?? []).flatMap((p) => p.name.split(/\s*\/\s*/))));
  }, []);

  const own = therapistName ? [therapistName, therapistName.replace(/^(dr|mr|mrs|ms|mx)\.?\s+/i, "").split(",")[0].trim()] : [];
  return [...own, ...payers, ...US_STATES];
}
