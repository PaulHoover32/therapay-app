"use client";

import { useState } from "react";
import { Session, PaymentOption, AppointmentType, SessionCode } from "@/lib/seed-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  sessions: Session[];
  onAdd: (session: Session) => void;
}

function getMostFrequentCombo(sessions: Session[]): { payment_option: PaymentOption; session_code: SessionCode } {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    const key = `${s.payment_option}|${s.session_code}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return { payment_option: "insurance", session_code: "90837" };
  const [payment_option, session_code] = top[0].split("|");
  return { payment_option: payment_option as PaymentOption, session_code: session_code as SessionCode };
}

const paymentOptions: PaymentOption[] = ["insurance", "self-pay", "sliding-scale", "eap"];
const appointmentTypes: AppointmentType[] = ["individual", "couples", "family", "group"];
const sessionCodes: SessionCode[] = ["90837", "90834", "90847", "90853", "90791"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function SessionForm({ sessions, onAdd }: Props) {
  const defaults = getMostFrequentCombo(sessions);

  const [form, setForm] = useState({
    amount: "",
    payment_option: defaults.payment_option,
    session_datetime: new Date("2026-03-20T10:00:00").toISOString().slice(0, 16),
    session_code: defaults.session_code,
    appointment_type: "individual" as AppointmentType,
    state: "CA",
    session_descriptor: "",
    session_duration: "53",
    payer: "",
  });

  function set(field: string, value: string | null) {
    if (value === null) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.payer) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const newSession: Session = {
      id: Math.random().toString(36).slice(2, 10),
      amount: parseFloat(form.amount),
      payment_option: form.payment_option as PaymentOption,
      session_datetime: new Date(form.session_datetime).toISOString(),
      session_code: form.session_code as SessionCode,
      appointment_type: form.appointment_type,
      state: form.state,
      session_descriptor: form.session_descriptor,
      session_duration: parseInt(form.session_duration),
      payer: form.payer,
    };
    onAdd(newSession);
    toast.success("Session added successfully.");
    setForm({
      amount: "",
      payment_option: defaults.payment_option,
      session_datetime: new Date("2026-03-20T10:00:00").toISOString().slice(0, 16),
      session_code: defaults.session_code,
      appointment_type: "individual",
      state: "CA",
      session_descriptor: "",
      session_duration: "53",
      payer: "",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount ($) *</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="150.00"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payer">Payer *</Label>
        <Input
          id="payer"
          placeholder="BlueCross BlueShield"
          value={form.payer}
          onChange={(e) => set("payer", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session_datetime">Date & Time *</Label>
        <Input
          id="session_datetime"
          type="datetime-local"
          value={form.session_datetime}
          onChange={(e) => set("session_datetime", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Payment Option *</Label>
        <Select value={form.payment_option} onValueChange={(v) => set("payment_option", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentOptions.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Session Code *</Label>
        <Select value={form.session_code} onValueChange={(v) => set("session_code", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sessionCodes.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Appointment Type *</Label>
        <Select value={form.appointment_type} onValueChange={(v) => set("appointment_type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {appointmentTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>State *</Label>
        <Select value={form.state} onValueChange={(v) => set("state", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session_duration">Duration (min) *</Label>
        <Input
          id="session_duration"
          type="number"
          min="1"
          value={form.session_duration}
          onChange={(e) => set("session_duration", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="session_descriptor">Description</Label>
        <Input
          id="session_descriptor"
          placeholder="Session notes or description"
          value={form.session_descriptor}
          onChange={(e) => set("session_descriptor", e.target.value)}
        />
      </div>

      <div className="sm:col-span-2 flex items-end">
        <Button type="submit" className="w-full">
          Add Session
        </Button>
      </div>
    </form>
  );
}
