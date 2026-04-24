import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const TEST_ACCOUNTS = [
  { label: "Sarah", email: "sarah@therapay.dev" },
  { label: "Marcus", email: "marcus@therapay.dev" },
  { label: "Jordan", email: "jordan@therapay.dev" },
];

interface Props {
  onLogin: (email: string, password: string) => void;
  loading: boolean;
  error: string;
}

export function LoginView({ onLogin, loading, error }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onLogin(email, password);
  }

  function fillTestAccount(testEmail: string) {
    setEmail(testEmail);
    setPassword("password123");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Therapay</h1>
        <p className="text-muted-foreground text-sm mt-1">Log therapy sessions quickly</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Test accounts · password123</p>
        <div className="flex gap-2">
          {TEST_ACCOUNTS.map((acct) => (
            <Button
              key={acct.email}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => fillTestAccount(acct.email)}
            >
              {acct.label}
            </Button>
          ))}
        </div>
        {email && password === "password123" && (
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        )}
      </div>
    </div>
  );
}
