"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { usePanelStore } from "@/lib/stores/panel";
import PanelState from "../PanelState";

interface Profile {
  name: string;
  license_type: string;
  specialties: string;
  years_licensed: string;
  practice_model: string;
  states: string;
}

const EMPTY: Profile = { name: "", license_type: "", specialties: "", years_licensed: "", practice_model: "", states: "" };

export default function ProfileView() {
  const dataVersion = usePanelStore((s) => s.dataVersion);
  const invalidate = usePanelStore((s) => s.invalidate);
  const [form, setForm] = useState<Profile | null>(null);
  const [licensures, setLicensures] = useState<{ code: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase.from("therapists").select("name, license_type, specialties, years_licensed, practice_model, states").maybeSingle(),
      supabase.from("reference_licensures").select("code, label").order("sort_order"),
    ]).then(([{ data: t }, { data: refs }]) => {
      setLicensures(refs ?? []);
      setForm(
        t
          ? {
              name: t.name ?? "",
              license_type: t.license_type ?? "",
              specialties: t.specialties ?? "",
              years_licensed: t.years_licensed?.toString() ?? "",
              practice_model: t.practice_model ?? "",
              states: (t.states ?? []).join(", "),
            }
          : EMPTY
      );
    });
  }, [dataVersion]);

  if (!form) return <PanelState loading />;

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const years = parseInt(form.years_licensed, 10);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSaving(false);
    const { error } = await supabase
      .from("therapists")
      .update({
        name: form.name.trim(),
        license_type: form.license_type || null,
        specialties: form.specialties.trim() || null,
        years_licensed: Number.isFinite(years) && years > 0 ? years : null,
        practice_model: form.practice_model.trim() || null,
        states: form.states
          .split(/[,\s]+/)
          .map((s) => s.trim().toUpperCase())
          .filter((s) => /^[A-Z]{2}$/.test(s)),
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your profile.");
      return;
    }
    toast.success("Profile saved");
    invalidate();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Name">
        <Input value={form.name} onChange={set("name")} required />
      </Field>
      <Field label="License type">
        <Select value={form.license_type} onValueChange={(v) => setForm({ ...form, license_type: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a license" />
          </SelectTrigger>
          <SelectContent>
            {licensures.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.code} — {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Specialties">
        <Input value={form.specialties} onChange={set("specialties")} placeholder="Trauma, Anxiety, CBT" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Years licensed">
          <Input value={form.years_licensed} onChange={set("years_licensed")} inputMode="numeric" />
        </Field>
        <Field label="States">
          <Input value={form.states} onChange={set("states")} placeholder="CA, NY" />
        </Field>
      </div>
      <Field label="Practice model">
        <Input value={form.practice_model} onChange={set("practice_model")} placeholder="Solo private practice" />
      </Field>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
