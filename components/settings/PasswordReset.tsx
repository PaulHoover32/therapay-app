"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function PasswordReset({ email }: { email: string }) {
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Reset link sent to ${email}`);
  }

  return (
    <Button variant="outline" size="sm" onClick={send} disabled={sending || !email}>
      {sending ? "Sending…" : "Send reset link"}
    </Button>
  );
}
