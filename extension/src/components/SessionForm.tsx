import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { ReferencePayer, ReferenceSessionCode } from "../types";
import { supabase } from "../supabase";
import { US_STATES } from "../constants";
import { RECENT_AMOUNTS_STORAGE_KEY, buildUpdatedRecents } from "@therapay/recent-amounts";

async function loadRecentAmounts(): Promise<string[]> {
  const result = await chrome.storage.local.get(RECENT_AMOUNTS_STORAGE_KEY);
  return (result[RECENT_AMOUNTS_STORAGE_KEY] as string[]) ?? [];
}

async function saveRecentAmount(amount: string) {
  const existing = await loadRecentAmounts();
  const updated = buildUpdatedRecents(amount, existing);
  await chrome.storage.local.set({ [RECENT_AMOUNTS_STORAGE_KEY]: updated });
}

function todayDateValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Props {
  therapistId: string | null;
  payers: ReferencePayer[];
  sessionCodes: ReferenceSessionCode[];
}

export function SessionForm({ therapistId, payers, sessionCodes }: Props) {
  const [amount, setAmount] = useState("");
  const [sessionDate, setSessionDate] = useState(todayDateValue());
  const [sessionCode, setSessionCode] = useState("");
  const [state, setState] = useState("");
  const [payer, setPayer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentAmounts, setRecentAmounts] = useState<string[]>([]);

  useEffect(() => {
    loadRecentAmounts().then(setRecentAmounts);
  }, []);

  function reset() {
    setAmount("");
    setSessionDate(todayDateValue());
    setSessionCode("");
    setState("");
    setPayer("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!therapistId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("sessions").insert({
        session_datetime: sessionDate,
        amount: parseFloat(amount),
        state,
        session_code: sessionCode,
        payer,
        therapist_id: therapistId,
      });

      if (error) {
        toast.error("Failed to save session. Please try again.");
      } else {
        await saveRecentAmount(amount);
        setRecentAmounts(await loadRecentAmounts());
        toast.success("Session logged!");
        reset();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = amount && sessionCode && state && payer && therapistId;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount ($)</Label>
        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {recentAmounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {recentAmounts.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                ${a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-date">Date</Label>
        <Input
          id="session-date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Session Code</Label>
        <Select value={sessionCode} onValueChange={setSessionCode}>
          <SelectTrigger>
            <SelectValue placeholder="Select code…" />
          </SelectTrigger>
          <SelectContent>
            {sessionCodes.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="font-mono">{c.code}</span>
                {c.description && (
                  <span className="text-muted-foreground ml-2 text-xs">{c.description}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>State</Label>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger>
            <SelectValue placeholder="Select state…" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Payer</Label>
        <Select value={payer} onValueChange={setPayer}>
          <SelectTrigger>
            <SelectValue placeholder="Select payer…" />
          </SelectTrigger>
          <SelectContent>
            {payers.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={!isValid || submitting} className="w-full mt-2">
        {submitting ? "Saving…" : "Log Session"}
      </Button>
    </form>
  );
}
