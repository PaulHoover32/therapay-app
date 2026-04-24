import { createClient } from "@supabase/supabase-js";
import { chromeStorageAdapter } from "./chromeStorage";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
