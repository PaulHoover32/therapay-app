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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const TEST_ACCOUNTS = [
  { email: "sarah@therapay.dev", name: "Dr. Sarah Chen", description: "High earner · $120k goal · mixed payers" },
  { email: "marcus@therapay.dev", name: "Marcus Rivera, LCSW", description: "Mid-career · $85k goal · insurance-heavy" },
  { email: "jordan@therapay.dev", name: "Jordan Kim, LPC", description: "Building practice · $60k goal · self-pay" },
];

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError("Invalid email or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillAccount(testEmail: string) {
    setEmail(testEmail);
    setPassword("password123");
    setError("");
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
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive -mt-2">{error}</p>
              )}
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

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
    </div>
  );
}
