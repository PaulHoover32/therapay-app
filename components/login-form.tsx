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
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const TEST_ACCOUNTS = [
  { email: "sarah@therapay.dev", name: "Dr. Sarah Chen", description: "High earner · $120k goal · mixed payers" },
  { email: "marcus@therapay.dev", name: "Marcus Rivera, LCSW", description: "Mid-career · $85k goal · insurance-heavy" },
  { email: "jordan@therapay.dev", name: "Jordan Kim, LPC", description: "Building practice · $60k goal · self-pay" },
  { email: "test@test.ai", name: "Lauren Ruest, LMFT", description: "Established practice · insurance-heavy · CA" },
];

type Mode = "signin" | "signup" | "check-email";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
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
        router.push("/dashboard");
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
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Therapay</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and project your therapy practice earnings
          </p>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              ✉️
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to verify your account and get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-center text-muted-foreground">
              Didn&apos;t get it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="underline hover:text-foreground transition-colors"
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
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Therapay</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and project your therapy practice earnings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Enter your credentials to access your dashboard."
              : "Start tracking your practice earnings today."}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? mode === "signin" ? "Signing in…" : "Creating account…"
                : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-foreground underline hover:no-underline transition-all"
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
                    className="text-foreground underline hover:no-underline transition-all"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>

      {mode === "signin" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Test accounts</CardTitle>
            <CardDescription className="text-xs">
              All use password:{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">
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
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
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
