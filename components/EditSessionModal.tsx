"use client";

import { useState } from "react";
import { Session, PaymentOption, AppointmentType, SessionCode } from "@/lib/seed-data";
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
import { toast } from "sonner";

interface Props {
  session: Session | null;
  open: boolean;
  onClose: () => void;
  onSave: (session: Session) => void;
  onSaveAsNew: (session: Session) => void;
}

const paymentOptions: PaymentOption[] = ["insurance", "self-pay", "sliding-scale", "eap"];
const appointmentTypes: AppointmentType[] = ["individual", "couples", "family", "group"];
const sessionCodes: SessionCode[] = ["90837", "90834", "90847", "90853", "90791"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function EditSessionModal({ session, open, onClose, onSave, onSaveAsNew }: Props) {
  const [form, setForm] = useState<Partial<Session>>({});

  // Sync form when session changes
  const current: Session | null = session
    ? { ...session, ...form, id: session.id }
    : null;

  function set(field: keyof Session, value: string | number | null) {
    if (value === null) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function getVal(field: keyof Session) {
    if (field in form) return form[field] as string | number;
    return session?.[field] ?? "";
  }

  function handleSave() {
    if (!current) return;
    onSave(current);
    toast.success("Session updated.");
    setForm({});
    onClose();
  }

  function handleSaveAsNew() {
    if (!current) return;
    const newSession = { ...current, id: Math.random().toString(36).slice(2, 10) };
    onSaveAsNew(newSession);
    toast.success("New session created.");
    setForm({});
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setForm({});
      onClose();
    }
  }

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
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
            <Label>Payment Option</Label>
            <Select
              value={String(getVal("payment_option"))}
              onValueChange={(v) => set("payment_option", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Session Code</Label>
            <Select
              value={String(getVal("session_code"))}
              onValueChange={(v) => set("session_code", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sessionCodes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Appointment Type</Label>
            <Select
              value={String(getVal("appointment_type"))}
              onValueChange={(v) => set("appointment_type", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>State</Label>
            <Select
              value={String(getVal("state"))}
              onValueChange={(v) => set("state", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Duration (min)</Label>
            <Input
              type="number"
              min="1"
              value={getVal("session_duration")}
              onChange={(e) => set("session_duration", parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={String(getVal("session_descriptor"))}
              onChange={(e) => set("session_descriptor", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={handleSaveAsNew}>Save as New</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
