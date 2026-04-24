import { useEffect, useState } from "react";
import type { ReferencePayer, ReferenceSessionCode } from "../types";
import { supabase } from "../supabase";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedEntry<T> {
  data: T[];
  fetchedAt: number;
}

async function getCached<T>(key: string): Promise<T[] | null> {
  const result = await chrome.storage.local.get(key);
  const entry = result[key] as CachedEntry<T> | undefined;
  if (!entry || entry.data.length === 0) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.data;
}

async function setCached<T>(key: string, data: T[]) {
  await chrome.storage.local.set({ [key]: { data, fetchedAt: Date.now() } });
}

export function useReferenceData() {
  const [payers, setPayers] = useState<ReferencePayer[]>([]);
  const [sessionCodes, setSessionCodes] = useState<ReferenceSessionCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [cachedPayers, cachedCodes] = await Promise.all([
        getCached<ReferencePayer>("therapay_ref_payers"),
        getCached<ReferenceSessionCode>("therapay_ref_session_codes"),
      ]);

      if (cachedPayers && cachedCodes) {
        if (!cancelled) {
          setPayers(cachedPayers);
          setSessionCodes(cachedCodes);
          setLoading(false);
        }
        return;
      }

      const [payersRes, codesRes] = await Promise.all([
        supabase.from("reference_payers").select("id, name, payment_option").eq("active", true).order("sort_order"),
        supabase.from("reference_session_codes").select("code, appointment_type, session_duration, description").eq("active", true).order("code"),
      ]);

      if (cancelled) return;

      const freshPayers = (payersRes.data ?? []) as ReferencePayer[];
      const freshCodes = (codesRes.data ?? []) as ReferenceSessionCode[];

      await Promise.all([
        setCached("therapay_ref_payers", freshPayers),
        setCached("therapay_ref_session_codes", freshCodes),
      ]);

      setPayers(freshPayers);
      setSessionCodes(freshCodes);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { payers, sessionCodes, loading };
}
