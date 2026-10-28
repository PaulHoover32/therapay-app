"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function EmailField({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);
  const changed = email.trim().toLowerCase() !== currentEmail.toLowerCase();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ email: email.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Check both inboxes to confirm the change.");
  }

  return (
    <form onSubmit={save} className="flex gap-2">
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="max-w-sm" />
      <Button type="submit" variant="outline" disabled={!changed || saving}>
        {saving ? "Saving…" : "Update"}
      </Button>
    </form>
  );
}
