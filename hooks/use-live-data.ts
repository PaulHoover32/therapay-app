"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { usePanelStore } from "@/lib/stores/panel";

// Refreshes panel views when the user's data changes anywhere (Chrome extension, another tab or
// device). Changes made through the assistant already refresh via tool results.
// Known gap: Realtime can't filter DELETE events by owner, so outside deletes show on next refresh.
export function useLiveData(userId: string, therapistId: string | null) {
  const invalidate = usePanelStore((s) => s.invalidate);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Coalesce bursts (e.g. a bulk import) into one refresh
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(invalidate, 400);
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // The socket must carry the user's JWT, or RLS hides every change from this subscriber
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`live:${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${userId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "recommendations", filter: `user_id=eq.${userId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "therapists", filter: `user_id=eq.${userId}` }, refresh);
      if (therapistId) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `therapist_id=eq.${therapistId}` }, refresh);
      }
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("Live data subscription failed:", status, err?.message);
      });
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, therapistId, invalidate]);
}
