"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { DEFAULT_AFTER_LOGIN } from "@/lib/safe-next";

const TEST_ACCOUNTS = [
  { email: "sarah@therapay.dev", name: "Dr. Sarah Chen", description: "High earner · $120k goal · mixed payers" },
  { email: "marcus@therapay.dev", name: "Marcus Rivera, LCSW", description: "Mid-career · $85k goal · insurance-heavy" },
  { email: "jordan@therapay.dev", name: "Jordan Kim, LPC", description: "Building practice · $60k goal · self-pay" },
  { email: "test@test.ai", name: "Lauren Ruest, LMFT", description: "Established practice · insurance-heavy · CA" },
];

type Mode = "signin" | "signup" | "check-email";

// Seeded demo accounts; never advertise them outside local development
const SHOW_TEST_ACCOUNTS = process.env.NODE_ENV === "development";

export function LoginForm({
  className,
  next,
  initialMode = "signin",
  ...props
}: React.ComponentProps<"div"> & {
  /** Same-origin path to continue to after sign-in (already validated by the page) */
  next?: string;
  initialMode?: "signin" | "signup";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("Invalid email or password.");
      } else {
        router.push(next ?? DEFAULT_AFTER_LOGIN);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim(), needs_onboarding: true },
          emailRedirectTo: next
            ? `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`
            : `${window.location.origin}/auth/confirm`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setMode("check-email");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillAccount(testEmail: string) {
    setMode("signin");
    setEmail(testEmail);
    setPassword("password123");
    setError("");
  }

  function switchMode(next: Mode) {
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setMode(next);
  }

  if (mode === "check-email") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="shadow-none">
          <CardHeader>
            <Mail aria-hidden className="mb-2 size-6 text-primary" />
            <CardTitle className="font-display text-2xl font-medium">Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to verify your account and get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Didn&apos;t get it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="text-foreground underline underline-offset-4 hover:text-tide transition-colors"
              >
                try again
              </button>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-medium">{mode === "signin" ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "One Therapay account works here and in Claude or ChatGPT."
              : "Ask Claude or ChatGPT whether your year is on track. Therapay never stores client details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? mode === "signin" ? "Signing in…" : "Creating account…"
                : mode === "signin" ? "Sign in" : "Create your account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-foreground underline underline-offset-4 hover:text-tide transition-colors"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="text-foreground underline underline-offset-4 hover:text-tide transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>

      {mode === "signin" && SHOW_TEST_ACCOUNTS && (
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Test accounts</CardTitle>
            <CardDescription className="text-xs">
              All use password:{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">
                password123
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {TEST_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillAccount(a.email)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring transition-colors"
              >
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
