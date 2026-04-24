import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

const PROJECT_REF = "pbijbpfgmcbtipuebsnn";
const COOKIE_BASE = `sb-${PROJECT_REF}-auth-token`;
const APP_DOMAINS = ["therapay.dev", "localhost"];

// Read Supabase SSR chunked cookies from the main app and return the session JSON
async function readAppSession(): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    let raw = "";
    for (const domain of APP_DOMAINS) {
      // Try unchunked first
      const single = await chrome.cookies.get({ url: domain === "localhost" ? "http://localhost:3000" : `https://${domain}`, name: COOKIE_BASE });
      if (single?.value) {
        raw = decodeURIComponent(single.value);
        break;
      }
      // Try chunked (.0, .1, ...)
      let chunked = "";
      for (let i = 0; i < 5; i++) {
        const chunk = await chrome.cookies.get({ url: domain === "localhost" ? "http://localhost:3000" : `https://${domain}`, name: `${COOKIE_BASE}.${i}` });
        if (!chunk?.value) break;
        chunked += decodeURIComponent(chunk.value);
      }
      if (chunked) { raw = chunked; break; }
    }
    if (!raw) return null;
    // Value is base64url encoded JSON
    const decoded = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded);
    if (parsed.access_token && parsed.refresh_token) return parsed;
  } catch {
    // Ignore parse/cookie errors
  }
  return null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        return;
      }
      // No local session — try to pick up the browser's app session
      const appSession = await readAppSession();
      if (appSession) {
        const { data: setData } = await supabase.auth.setSession({
          access_token: appSession.access_token,
          refresh_token: appSession.refresh_token,
        });
        setSession(setData.session);
        return;
      }
      setSession(null);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError("Invalid email or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return { session, loading, error, login, logout };
}
