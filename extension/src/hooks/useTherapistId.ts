import { useEffect, useState } from "react";
import { supabase } from "../supabase";

interface CachedTherapistId {
  id: string;
  userId: string;
}

export function useTherapistId(userId: string | undefined) {
  const [therapistId, setTherapistId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setTherapistId(null); return; }
    let cancelled = false;

    async function load() {
      const result = await chrome.storage.local.get("therapay_therapist_id");
      const cached = result["therapay_therapist_id"] as CachedTherapistId | undefined;

      if (cached && cached.userId === userId) {
        if (!cancelled) setTherapistId(cached.id);
        return;
      }

      const { data } = await supabase
        .from("therapists")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (cancelled || !data) return;

      await chrome.storage.local.set({ therapay_therapist_id: { id: data.id, userId } });
      setTherapistId(data.id);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return therapistId;
}
