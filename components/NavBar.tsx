"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Props {
  name: string;
}

export default function NavBar({ name }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">Therapay</span>
          <span className="text-muted-foreground text-sm hidden sm:block">/ {name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
