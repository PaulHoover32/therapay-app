"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSupabaseBrowserClient } from "@/lib/supabase"

const LICENSE_TYPES = ["LCSW", "LPC", "LMFT", "PhD/PsyD", "MFT", "LPCC", "Other"]
const PRACTICE_MODELS = [
  { value: "private_pay", label: "Private pay only" },
  { value: "insurance", label: "Insurance only" },
  { value: "mixed", label: "Mixed (both)" },
]

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]

interface Props {
  userId: string
  defaultName?: string
}

export function OnboardingForm({ userId, defaultName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Step 1 fields
  const [name, setName] = useState(defaultName ?? "")
  const [licenseType, setLicenseType] = useState("")
  const [yearsLicensed, setYearsLicensed] = useState("")

  // Step 2 fields
  const [practiceModel, setPracticeModel] = useState("")
  const [state, setState] = useState("")

  function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Please enter your name."); return }
    if (!licenseType) { setError("Please select your license type."); return }
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()

      const { error: insertError } = await supabase.from("therapists").upsert({
        user_id: userId,
        name: name.trim(),
        license_type: licenseType,
        years_licensed: yearsLicensed ? parseInt(yearsLicensed) : null,
        practice_model: practiceModel || null,
        states: state ? [state] : null,
        onboarding_completed_at: new Date().toISOString(),
      }, { onConflict: "user_id" })

      if (insertError) {
        setError("Something went wrong. Please try again.")
        setLoading(false)
        return
      }

      await supabase.auth.updateUser({ data: { needs_onboarding: false } })
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">Step {step} of 2</span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
            <CardDescription>
              Tell us a bit about your practice so we can personalize your experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="license-type">License type</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger id="license-type">
                    <SelectValue placeholder="Select your license" />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="years-licensed">
                  Years licensed{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="years-licensed"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="5"
                  value={yearsLicensed}
                  onChange={(e) => setYearsLicensed(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Your practice</CardTitle>
            <CardDescription>
              A few more details help us give you better projections.{" "}
              <span className="text-muted-foreground">You can update these anytime on your profile.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="practice-model">
                  Practice model{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={practiceModel} onValueChange={setPracticeModel}>
                  <SelectTrigger id="practice-model">
                    <SelectValue placeholder="How do you bill clients?" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRACTICE_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state">
                  Primary state{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Where do you practice?" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setError(""); setStep(1) }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Setting up…" : "Go to dashboard"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
