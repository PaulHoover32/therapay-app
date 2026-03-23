"use client";

import { useState } from "react";
import { Session, SessionInput, PaymentOption, AppointmentType, ReferencePayer, ReferenceSessionCode } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  session: Session | null;
  open: boolean;
  mode?: "edit" | "add";
  onClose: () => void;
  onSave: (session: Session) => void;
  onSaveAsNew: (input: SessionInput) => void;
  payers: ReferencePayer[];
  sessionCodes: ReferenceSessionCode[];
}

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function EditSessionModal({ session, open, mode = "edit", onClose, onSave, onSaveAsNew, payers, sessionCodes }: Props) {
  const [form, setForm] = useState<Partial<Session>>({});

  function set(field: keyof Session, value: string | number | null) {
    if (value === null) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function getVal(field: keyof Session) {
    if (field in form) return form[field] as string | number;
    if (mode === "edit") return session?.[field] ?? "";
    return "";
  }

  function buildInferred(code: string, payerName: string): Pick<Session, "appointment_type" | "session_duration" | "payment_option"> {
    const codeRef = sessionCodes.find((c) => c.code === code);
    const payerRef = payers.find((p) => p.name === payerName);
    return {
      appointment_type: (codeRef?.appointment_type ?? "individual") as AppointmentType,
      session_duration: codeRef?.session_duration ?? 50,
      payment_option: (payerRef?.payment_option ?? "insurance") as PaymentOption,
    };
  }

  function buildInput(code: string, payer: string): SessionInput {
    return {
      session_datetime: (form.session_datetime as string) || (session?.session_datetime ?? new Date().toISOString()),
      amount: (form.amount as number) ?? (session?.amount ?? 0),
      state: (form.state as string) || (session?.state ?? ""),
      session_descriptor: "",
      session_code: code,
      payer,
      ...buildInferred(code, payer),
    };
  }

  function handleSave() {
    if (!session) return;
    const code = String(form.session_code ?? session.session_code);
    const payer = String(form.payer ?? session.payer);
    const updated: Session = { ...session, ...form, id: session.id, ...buildInferred(code, payer) };
    onSave(updated);
    setForm({});
    onClose();
  }

  function handleSaveAsNew() {
    if (!session) return;
    const code = String(form.session_code ?? session.session_code);
    const payer = String(form.payer ?? session.payer);
    onSaveAsNew(buildInput(code, payer));
    setForm({});
    onClose();
  }

  function handleAdd() {
    const code = String(form.session_code ?? sessionCodes[0]?.code ?? "90837");
    const payer = String(form.payer ?? payers[0]?.name ?? "Cash");
    onSaveAsNew(buildInput(code, payer));
    setForm({});
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (!open) { setForm({}); onClose(); }
  }

  if (mode === "edit" && !session) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Session" : "Edit Session"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={getVal("amount")}
              onChange={(e) => set("amount", parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={String(getVal("session_datetime")).slice(0, 16)}
              onChange={(e) => set("session_datetime", new Date(e.target.value).toISOString())}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Session Code</Label>
            <Select
              value={String(getVal("session_code"))}
              onValueChange={(v) => set("session_code", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…">
                  <span className="font-mono">{String(getVal("session_code")) || "Select…"}</span>
                </SelectValue>
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
            <Select
              value={String(getVal("state"))}
              onValueChange={(v) => set("state", v)}
            >
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Payer</Label>
            <Select
              value={String(getVal("payer"))}
              onValueChange={(v) => set("payer", v)}
            >
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {payers.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {mode === "edit" ? (
            <>
              <Button variant="secondary" onClick={handleSaveAsNew}>Save as New</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </>
          ) : (
            <Button onClick={handleAdd}>Add Session</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
