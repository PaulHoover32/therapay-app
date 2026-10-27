"use client";

import { useEffect, useState } from "react";
import { usePanelStore } from "@/lib/stores/panel";
import type { QueryName, Row } from "@/lib/analytics/queries";

interface AnalyticsState {
  rows: Row[] | null;
  error: string | null;
  loading: boolean;
}

async function fetchRows(input: RequestInfo, init?: RequestInit): Promise<Row[]> {
  const res = await fetch(input, init);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.rows as Row[];
}

function useRows(key: string | null, load: () => Promise<Row[]>): AnalyticsState {
  const dataVersion = usePanelStore((s) => s.dataVersion);
  const [state, setState] = useState<AnalyticsState>({ rows: null, error: null, loading: true });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    load()
      .then((rows) => !cancelled && setState({ rows, error: null, loading: false }))
      .catch((e: Error) => !cancelled && setState({ rows: null, error: e.message, loading: false }));
    return () => {
      cancelled = true;
    };
    // load is derived from key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dataVersion]);

  return state;
}

// Runs a named query from lib/analytics/queries.ts; refetches when panel data is invalidated
export function useAnalytics(name: QueryName, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ q: name, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const url = `/api/analytics?${qs}`;
  return useRows(url, () => fetchRows(url));
}

// Runs a model-authored read-only SELECT (chart view)
export function useAnalyticsSelect(sql: string | undefined) {
  return useRows(sql ?? null, () =>
    fetchRows("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    })
  );
}
