"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AppleIcon, GoogleIcon, MicrosoftIcon } from "@/components/auth/ProviderIcons";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { DEFAULT_AFTER_LOGIN } from "@/lib/safe-next";

// Sign-up and sign-in are the same action: every method creates the account on first use.
// No passwords; the seeded demo accounts below are a local-development shortcut only.

const PROVIDERS: { id: Provider; label: string; Icon: typeof GoogleIcon; scopes?: string }[] = [
  { id: "google", label: "Continue with Google", Icon: GoogleIcon },
  { id: "apple", label: "Continue with Apple", Icon: AppleIcon },
  { id: "azure", label: "Continue with Microsoft", Icon: MicrosoftIcon, scopes: "email" },
];

const TEST_ACCOUNTS = ["sarah@therapay.dev", "marcus@therapay.dev", "jordan@therapay.dev"];
const SHOW_TEST_ACCOUNTS = process.env.NODE_ENV === "development";

export function LoginForm({
  className,
  next,
  ...props
}: React.ComponentProps<"div"> & {
  /** Same-origin path to continue to after sign-in (already validated by the page) */
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", next ?? DEFAULT_AFTER_LOGIN);
    return url.toString();
  };

  async function withProvider(provider: (typeof PROVIDERS)[number]) {
    setError("");
    setPending(provider.id);
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: provider.id,
      options: { redirectTo: callbackUrl(), scopes: provider.scopes },
    });
    // On success the browser is already navigating to the provider
    if (authError) {
      setError(authError.message);
      setPending(null);
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending("email");
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setPending(null);
    if (authError) setError(authError.message);
    else setSentTo(email.trim());
  }

  async function asTestAccount(testEmail: string) {
    setError("");
    setPending(testEmail);
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithPassword({
      email: testEmail,
      password: "password123",
    });
    if (authError) {
      setError(authError.message);
      setPending(null);
      return;
    }
    router.push(next ?? DEFAULT_AFTER_LOGIN);
    router.refresh();
  }

  if (sentTo) {
    return (
      <div className={cn("space-y-3 rounded-xl border p-6 text-center", className)} {...props}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-5" />
        </div>
        <h2 className="font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-foreground">{sentTo}</span>. Open it on this
          device to continue.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="space-y-3">
        {PROVIDERS.map((p, i) => (
          <Button
            key={p.id}
            type="button"
            size="lg"
            variant={i === 0 ? "default" : "outline"}
            className="w-full"
            disabled={pending !== null}
            onClick={() => withProvider(p)}
          >
            {pending === p.id ? <Loader2 className="size-4 animate-spin" /> : <p.Icon className="size-4" />}
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        or use your email
        <Separator className="flex-1" />
      </div>

      <form onSubmit={withEmail} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
          />
        </div>
        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={pending !== null}>
          {pending === "email" && <Loader2 className="size-4 animate-spin" />}
          Email me a sign-in link
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {SHOW_TEST_ACCOUNTS && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">Dev only: seeded test accounts</p>
          <div className="flex flex-wrap gap-2">
            {TEST_ACCOUNTS.map((a) => (
              <Button
                key={a}
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending !== null}
                onClick={() => asTestAccount(a)}
              >
                {a.split("@")[0]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
