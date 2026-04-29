"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground">
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
