# Next enhancements (CEO review, 2026-11-04)

Plan under review: the shipped "Am I on track?" product (`docs/designs/am-i-on-track-check-in.md`, PRs #3–#5).
Goal of this round: choose the next enhancements. Review depth: strategy + implementation-ready for accepted items.

## Binding decisions (outrank defaults)
- Income = payouts only; rate card × counts are for mix analysis, never added to income.
- No session-level data; no free text that could hold client details.
- Chat-first: product functionality lives in Claude/ChatGPT (MCP tools, prompts, instructions). Web app = login/account/connect only.
- Peer cohort benchmarking deferred until density plus a ~20-peer privacy floor.
- **Amendment (founder, 2026-11-04, U3):** payer names may be submitted as free text, but only through the vetting path in U3; they are never shown to other therapists until a second therapist independently submits the same normalized name. CLAUDE.md's privacy rule is updated to match.
- **Clarification (founder, 2026-11-04, U8):** public marketing and help pages (e.g. /guides) are front door, like the landing page; "no web-app functionality" means no product features (data entry, dashboards) on the web.

## Step 0

### 0A. Premise
- **Real problem:** a 1099 therapist can't tell mid-year whether she'll match last year or grow 5–10%. `check_in` answers it directly, not a proxy.
- **Gap:** no real user has used it in Claude yet. The founder's account holds 112 real Stripe payouts (Oct 2024 → Nov 2026) [measured: prod DB], so real data exists, but usage evidence is zero.
- **Do-nothing cost:** low in code terms; high in learning terms. Every enhancement before her first session is a guess.

### 0B. Existing code leverage
| Sub-problem | Reuse |
|---|---|
| Pacing, projection, levers | `lib/pacing.ts` (`computeCheckIn`, `weeks_off_affordable`, `forecastPayouts`) |
| Rate card, counts, goals | `lib/planning.ts`, `lib/mcp/planning-tools.ts` |
| Guided flows | `lib/mcp/prompts.ts` |
| Payout data in | `lib/mcp/import-tools.ts` (dedupe, coverage warnings) |

### Reality rows
- REALITY: premise-table pass — check_in/rate card/goals exist (lib/mcp/planning-tools.ts); prod lists 9 tools [measured 2026-11-04]; real payouts exist only in the founder's account [measured: prod DB]; unverified=1 (MCP interactive UI support in both apps).
- REALITY: already-done pass — origin/main at PR #5; no enhancement work in flight (git log).
- REALITY: surface-check finding — "interactive UI in chat" (MCP Apps) support in Claude and ChatGPT is unverified for this SDK version; must probe before committing to it.
- REALITY: binding-decisions pass — three binding decisions above (gstack-decision-search).
- REALITY: numbers pass — "5% of therapists use AI for financial forecasting" [measured: Heard 2026 report via BusinessWire; secondary figure not verified in the full report].
- REALITY: deferred-asks pass — no linked issue.
- REALITY: pr-count pass — default one PR per wave.

### 0C. Dream state
```
  CURRENT STATE                      THIS ROUND                          12-MONTH IDEAL
  check_in answers "on track?"  -->  make the answer visible, cover  --> a financial copilot in chat: pacing,
  as JSON Claude paraphrases;        the next questions she'll ask       taxes, underpayments, time off, peer
  one user (untested)                (taxes? time off?), keep it         benchmarks by platform/state; checks
                                     payouts-only                        in on its own each week
```

## Decision ledger
| ID and owner | Contract and evidence | Current | Proposed | Status | Exact approval and scope |
|---|---|---|---|---|---|
| E1 founder | Pacing chart rendered in chat (MCP interactive UI) | none | Add | deferred | Answer "Defer to TODOS" (2026-11-04) |
| E2 founder | Tax set-aside in check_in (set-aside %, quarter amount, next due date; guidance not advice) | none | Add | approved | Answer "Add" (2026-11-04) |
| E3 founder | plan_time_off tool (date range → projection without those weeks) | none | Add | approved | Answer "Add" (2026-11-04) |
| E4 founder | Highlights in check_in (best month, passed last year, streaks, goal hit) | none | Add | approved | Answer "Add" (2026-11-04) |
| E5 founder | Underpayment check (TODO 1) | TODO | Add | deferred | Answer "Defer to TODOS" (2026-11-04) |
| R1 reviewer | BUG (founder #5): levers use (target − settled YTD) and ignore money received for in-progress months; overstates need (observed 98 sessions/month) | lib/pacing.ts dollars_per_month_needed | Subtract in-progress received + still-arriving estimate; divide by months after the current month | approved (repair) | Repair of shipped behavior, required to meet check_in's contract; founder report 2026-11-04 |
| U1 founder #1–2 | Profile read-back + completeness | setup_profile write-only, all optional | get_profile tool (profile + missing list); setup_profile partial updates report missing; setup prompt + check_in nudge until 7 fields set | approved | Answer "Add" (2026-11-04) |
| U2 founder #3 | CPT expansion | 5 codes | 15 codes incl. add-ons (90785, 90840, 90833/90836/90838 flagged add-on, priced on top of a base, never counted as a session); optional modality telehealth/in_person on rates + counts; other codes only in HCPCS format ^[A-Z]\d{4}$ | approved | Answer "Add" (2026-11-04) |
| U3 founder #4 | Payers not on the list | fixed reference list; Kaiser → "Other" | Free-text submission, automatic vetting (no manual review to start), consolidated shared catalog with alias matching; new entry visible to others only after a 2nd therapist uses it | approved | Answers "free text then vetting" + "no review to start; list must be consolidated across therapists" (2026-11-04) |
| U4 founder #6 | Reality check on implausible results | none | Instructions only: tool description + server instructions tell the model to sanity-check and push back on implausible figures | approved | Answer "Instructions only" (2026-11-04) |
| U5 founder #7 | Guided onboarding | 3 prompts | get_started tool (what Therapay needs, why, what she gets); stepwise setup prompt with progress check; every error/data note names the next step | approved | Answer "Add" (2026-11-04) |
| U6 founder #8 | Host-drawn visuals | text/JSON | chart/table-ready data in check_in, plan_time_off, get_rate_card + instructions to render charts/tables/cards; no Therapay UI | approved | Answer "Add" (2026-11-04) |
| U7 founder #9 | Website redesign (therapy vibe) | current site | Separate design session (/design-consultation → /design-review), not this build | deferred (own session) | Answer "Own design session" (2026-11-04) |
| S1 founder | Sequencing | n/a | 3 waves | approved: build all at once | Answer "Build all at once" (2026-11-04) |
| S2 founder | U3 matching | fuzzy token overlap + auto-aliasing | exact match after normalizing + small seeded abbreviation map; aliases private until a 2nd therapist uses them; fuzzy deferred | approved | Answer "Trim to exact + abbreviations" (2026-11-04) |
| SEC1 S3 | Shared payer names reach other users' models (prompt injection) | none | ≤60 chars; letters, digits, space & . ' - / ( ); reject instruction-like words (ignore, instruction, system, prompt, http); same for aliases; test | approved | Answer "Add" (2026-11-04) |
| SEC2 S3 | Catalog spam via add_payer | none | ≤20 submit_payer calls per therapist per day, enforced in the function, clear message; test | approved | Answer "Add" (2026-11-04) |
| OBS1 S8 | No production record of MCP tool calls | tool_call_logs unused by MCP | Wrap every MCP tool: log tool name, status, duration, error message; never inputs/outputs | approved | Answer "Add" (2026-11-04) |
| X1 outside C1/C2 | R1 formula raises the figure when behind; real cause unknown | planned R1 | Investigate on real data first | approved → done | Answer "Investigate first" (2026-11-04); repro on founder data: 98 = total need ($9,542/mo ÷ $97.58) vs pace ≈85; Oct payouts duplicated; counts 48 vs ≈85 implied |
| X1a outside C2 (replaces R1) | Levers framing | total sessions/month | current pace ≈X sessions & $/mo, need ≈Y, gap Z (+P%); remaining-months math unchanged (12 − settled); plan_time_off same framing; test pins founder shape (≈85/≈98/≈13) | approved | Answer "Apply" (2026-11-04) |
| X1b new | Duplicate payouts across imports undetected | date-range overlap warning only | Flag same payer + same amount ≤4 days apart in different imports, at import and in check_in; name batch to undo; never block | approved | Answer "Apply" (2026-11-04) |
| X1c new | Counts × rates vs payouts mismatch | none | check_in data note when they differ >25% for the same months; income unaffected | approved | Answer "Apply" (2026-11-04) |
| X2 outside H1 | Shrink catalog to private names | shared catalog (U3) | — | declined (keep U3) | Answer "Keep shared catalog" (2026-11-04) |
| X3 outside H2/H3 | Real payer names rejected; "Grow" breaks | exact + abbreviations | Keep first-word fallback (unique among caller-visible names); seeded ~150 known insurers/platforms pass vetting; SEC1 allows '&', drops "system"; 30-name pass/fail fixture | approved | Answer "Apply all four" (2026-11-04) |
| X4 outside H4 | Logged error messages can contain typed text | OBS1 logs message | Log error code (unknown_payer, validation, db_error, rate_limited, internal) only; verify/recreate tool_call_logs in migration (existing cols: id, user_id, thread_id, tool_name, status, input, output, duration_ms, created_at — input/output left null) | approved | Answer "Apply" (2026-11-04) |
| M3 outside | U1 nags for unused fields | nudge all 7 | setup asks all 7 once; check_in nudges only for session length (and tax % when taxes asked) | approved | Answer "Apply" (2026-11-04) |
| M4 outside | Tool overlap | +get_profile (14 tools) | setup_profile with no args returns profile + missing; no get_profile (13 tools) | approved | Answer "Apply" (2026-11-04) |
| M6 outside (reopens S1) | Ship the shipped-bug fix alone | build all at once | PR A: X1a, X1b, X1c; PR B: everything else; same scope | approved | Answer "Apply" (2026-11-04) |
| M5 outside | Probe host chart rendering | none | — | declined | Answer "Skip the probe" (2026-11-04) |
| U8 founder #10 | Setup guides | steps on /connect | Public /guides pages for Claude + ChatGPT linked from /connect and marketing; Gemini only after verifying remote-MCP+OAuth support | approved | Answer "Add" (2026-11-04) |

## Accepted scope (this build)

### Repairs
- **R1 levers bug.** Remaining months = months after the current month + the unelapsed fraction of the current month (`1 − day/days_in_month`). `dollars_needed = max(0, target − ytd − in_progress.received_so_far − (in_progress.still_arriving_estimate ?? 0))`. `dollars_per_month_needed = dollars_needed ÷ remaining_months`; when remaining_months < 0.25 (late December) return `dollars_needed_this_month_lump` instead. `sessions_per_month_needed` uses the per-month figure. Unit test: in-progress months holding money no longer inflate the figure (founder's 98-sessions case reproduced and fixed).

### Pacing additions (`lib/pacing.ts`, pure, tested)
- **E2 tax set-aside.** `setup_profile` accepts `tax_set_aside_pct` (0–60) and `get_profile` returns it (new nullable column on `therapists`). Federal estimated-tax periods: P1 Jan 1–Mar 31 (due Apr 15), P2 Apr 1–May 31 (due Jun 15), P3 Jun 1–Aug 31 (due Sep 15), P4 Sep 1–Dec 31 (due Jan 15 next year). When set, check_in adds `taxes: { set_aside_pct, period, payouts_this_tax_period, set_aside_this_period, set_aside_ytd, next_due_date (approx., weekends not adjusted), note: "guidance, not tax advice" }`, cash basis by **payout_date**, paid payouts only. Unset → one data note offering to set it.
- **E3 plan_time_off({start, end}).** Dates YYYY-MM-DD, start ≤ end. Only the part of the range that is in the future and inside the current calendar year counts (past part ignored; next-year part reported as "outside this year's projection"). Max 12 weeks counted. Lost income = counted weeks × (pace ÷ 4.33). Returns `{ weeks_counted, lost_income, projected_before, projected_after, target, gap_after, on_track_after, make_up: { extra_sessions_per_month (blended rate), months_left } }`. Null pace/projection → error explaining what's missing (too early in the year, or import payouts). No months left after the time off → make_up reports the shortfall as final.
- **E4 highlights.** Settled months only; data window starts Jan 1 last year, so wording is "best month since <first month with payouts>". Rules in priority order, max 2: (1) goal reached, (2) passed last year's total on <date>, (3) best month since <month>, (4) ≥3 settled months in a row above the same month last year. None → empty list.

### Inputs and catalog
- **U1** Missing = null, '' or empty array. `avg_session_duration` counts as set only after the user sets it explicitly (new boolean column `session_length_confirmed`, set by setup_profile). `get_profile` returns `{ profile, missing, skipped }`; `setup_profile` accepts `skip: string[]` so a user can decline a field (skipped fields aren't nagged again). Setup prompt asks for missing fields until `missing` is empty (skipped ones excluded); check_in adds one data note while fields are missing.
- **U2** Codes:
  - Session codes: 90832, 90834, 90837, 90791, 90792, 90846, 90847, 90853, 90839.
  - Add-on codes (priced, never counted as sessions or in the per-session blended rate; reported as add-on revenue in mix levers): 90785, 90840, 90833, 90836, 90838 (the last three are prescriber add-ons to E/M visits; priced on their own since E/M codes aren't tracked).
  - Non-session codes: 96127 (per-instrument screening) and HCPCS-format codes `^[A-Z]\d{4}$` (e.g. H0004). Priced and counted, but kept out of session counts and blended rate; label "HCPCS <code>".
  - `modality text not null default ''` ('' | telehealth | in_person) added to `payer_rates` and `monthly_volume` **and to both unique constraints**; every key in `rateFor`, `currentRates`, `blendedRate`, `upsertRates`, `upsertMonth` and the onConflict strings includes modality. Rate lookup: exact modality first, then fall back to ''.
  - Zod: code = enum(base ∪ add-on ∪ non-session) ∪ HCPCS regex; `log_month` sessions cap raised to 40 per payer.
  - Migration replaces the CHECK constraints on cpt_code with the full list + HCPCS pattern.
- **U3** Payer catalog (exact matching, per S2):
  - Tables: `payer_catalog(id, name, normalized unique, kind insurer|platform|other, status active|provisional, payout_lag_days int null, created_by uuid null references therapists on delete set null, created_at)`, `payer_catalog_aliases(catalog_id, normalized, submitted_by uuid null on delete set null, status active|private)`, `payer_catalog_adopters(catalog_id, therapist_id, primary key both)`.
  - Normalization: lowercase, strip punctuation/extra spaces, apply a seeded abbreviation map (kp→kaiser permanente, bcbs→blue cross blue shield, uhc→united healthcare, …). The person-shape check runs on the **raw** text before normalizing.
  - Submit flow (`add_payer` tool, via SECURITY DEFINER function `submit_payer(raw text)`): normalized match on catalog name or active alias, or the submitter's own private alias → use it, record adoption. No match → vet: rejects person-shaped names (2–3 capitalized words, no org word), requires an org word (Health, Plan, Insurance, Care, Kaiser, Blue, Medicaid, Medicare, EAP, Tricare, Group, Network, Behavioral, Mutual, Permanente…) or a platform name; pass → new `provisional` entry + adoption by the submitter. A provisional entry or private alias becomes `active` when a **second distinct therapist** submits the same normalized text (adoption is recorded only by add_payer; see round-2 "U3 adoption").
  - Visibility: see "U3 visibility mechanics" under round-2 clarifications.
  - Lag: `getLagLookup` reads catalog `payout_lag_days`, then `kind` defaults (insurer 18, platform 14, other 14).
  - One lookup function `getPayerChoices(supabase)` replaces `getValidPayerNames` + platform list in lib/therapists.ts, lib/pacing.ts, lib/mcp/helpers.ts, lib/mcp/import-tools.ts and lib/mcp/planning-tools.ts; `reference_payers` and `reference_platforms` seed the catalog as `active` and stay as seed sources (not read at runtime).
  - Existing rows saved as "Other": left as-is (founder can re-label via set_rate_card / log_month).
  - Account deletion: created_by/submitted_by set null; a provisional entry with no adopters left is deleted by the delete_my_account function.
- **U4** Instructions only (tool description + server instructions), as approved.

### Guidance and display
- **U5** `get_started` tool returns plain-language steps, why each matters, what she gets, and progress: profile missing fields, payouts imported through <date>, rate card present, last month logged, goal set. Setup prompt calls get_started between steps. Next-step wording is updated in: check_in data notes, get_started, setup_profile, import_payouts (no-payouts and cut-short warnings), set_rate_card/log_month errors (unknown payer → add_payer).
- **U6** check_in and plan_time_off add `chart: { months: [{ month: "YYYY-MM", this_year, last_year, settled: boolean }], projection: { year_end, method } | null, target: number | null }`. New read-only tool `get_rate_card` returns current rates as rows (payer, platform, code, code_kind, modality, rate, effective_from). Descriptions + instructions: "Render as a chart/table/card when the app supports it; otherwise summarize."
- **U8** `/guides`, `/guides/claude`, `/guides/chatgpt` (public, added to PUBLIC_PATHS), linked from /connect and the marketing nav/footer. Gemini page only after verifying custom remote MCP connectors with OAuth.

### Round-2 clarifications (spec review, 2026-11-04)
- **R1:** `Levers` gains `dollars_needed_this_month_lump?: number`. When the lump is returned, `sessions_per_month_needed` is replaced by `sessions_needed_this_month = ceil(lump ÷ blended_rate)`. `payer_mix.what_if` uses the same remaining-months rule as R1.
- **E2:** `next_due_date` is the next due date on or after today (Jan 1–15 → last year's P4 Jan 15 date, labeled "for <year−1> Sep–Dec"). `taxes` is included in every check_in response when the % is set, including "too early to pace".
- **U1:** the 7 fields: name, license_type, years_licensed, specialties, practice_model, states, avg_session_duration. `tax_set_aside_pct` is optional and not one of them. `skip` is an enum of those 7 names (stored in a `profile_skipped text[]` column). Existing rows: `session_length_confirmed = false` (no backfill).
- **E4:** wording "passed last year's total in <month>". "Best month" fires only when the latest settled month is the best since the data window began. "Goal reached" compares settled YTD + in-progress received against the target.
- **E3:** weeks are fractional (counted days ÷ 7). Over 12 weeks: truncated to 12 with a note. No rate card → `make_up` gives dollars per month only. No target (no goal and incomplete last year) → returns before/after projection only, with a note suggesting set_goal.
- **U2:** `log_month` `sessions` array max 40 entries per payer (count per entry max 500, unchanged). `set_rate_card` and `log_month` schemas gain optional `modality` (enum telehealth|in_person). Add-on revenue in mix = Σ add-on rate × add-on count over the last 3 months. `payer_mix` highest/lowest consider session codes only. `code_kind` values: session | add_on | non_session.
- **U2 modality fallback:** for a count with modality '': use the '' rate if present, else the average of that payer/platform/code's modality rates. For a count with a modality: exact match, else the '' rate.
- **U6:** `chart.months` covers Jan of last year through the current month (both years in one series keyed by month-of-year: `{ month: "MM", this_year, last_year, settled }` for Jan through the current month, plus last year's remaining months with `this_year: null`). In plan_time_off, `projection` is after the time off and `projection_before` is included.
- **U3 alias creation:** `add_payer({ name, same_as?: catalog_id })`. When the exact normalized match fails, the tool returns up to 3 candidates that share a first word or abbreviation expansion; the model asks the user "is this the same as X?". Yes → call again with `same_as`, which records a `private` alias for the submitter (becomes `active` when a second distinct therapist submits the same normalized text with the same `same_as`). No → vetting path creates a new entry.
- **U3 kind:** derived. Matches a platform name → platform; contains Insurance/Health/Plan/Medicaid/Medicare/Blue/Kaiser/Mutual/Tricare → insurer; contains EAP → other (lag 30); else other.
- **U3 adoption:** recorded only by `submit_payer` (add_payer). Saving a rate/count/payout under a provisional name the user already submitted doesn't change activation. resolveName's first-word fallback is removed from catalog lookups (exact + abbreviations only, per S2).
- **U3 seed lags:** the seed migration copies lags so behavior doesn't change: reference payers by payment_option (insurance 18, eap 30, self-pay 7, sliding-scale 7) and platforms from `reference_platforms.payout_lag_days`.
- **U3 visibility mechanics:** RLS on `payer_catalog` (`status = 'active'` or an adopter row exists for the caller's therapist id); aliases readable only when active or submitted by the caller; adopters readable only for the caller's own rows. A SECURITY DEFINER function `payer_choices()` returns name, kind and payout lag only (no creator columns). `payer_catalog_adopters.therapist_id` references therapists on delete cascade.
- **U3 row scoping (round 3, privacy):** `payer_choices()` and the add_payer candidate search return only catalog rows where `status = 'active'` or the caller's therapist has an adopter row, and only aliases that are active or submitted by the caller. Test: therapist B cannot see therapist A's provisional entry or private alias through payer_choices() or add_payer candidates.
- **R1 gate:** the levers block in `computeCheckIn` is gated on the new remaining-months rule (months after the current month + unelapsed fraction), replacing `12 − settled months`.
- **E2 January:** from Jan 1–15, `period` and `set_aside_this_period` cover the new year's P1 (Jan 1–Mar 31) while `next_due_date` is last year's P4 payment; both are labeled.
- **U2 migration:** the replacement CHECK on `monthly_volume.cpt_code` keeps `''` allowed (the no-show/late-cancel row).
- **PR 1 also updates:** CLAUDE.md privacy rule (done in this review) and the comment in `lib/mcp/tools.ts` about free text.
- **U5 next-step list adds:** import_payouts unknown-payer row error → suggests add_payer.

### Tests (Vitest, all pure functions)
- R1: in-progress money reduces dollars/sessions needed; December lump.
- E2: period boundaries and due dates (Mar 31/Apr 1, May 31/Jun 1, Aug 31/Sep 1, Dec→Jan 15), unset pct → note.
- E3: future-only, cross-year split, 12-week cap, null pace error, no months left.
- E4: priority order and max 2, ≥3-month streak, "since <month>" wording.
- U1: missing/skipped computation, default session length counts as missing until confirmed.
- U2: add-on and non-session codes excluded from session count and blended rate; modality exact-then-'' lookup; HCPCS regex.
- U3: normalization + abbreviation map; person-shape rejection on raw text; org-word requirement; provisional→active on second distinct therapist (function test via SQL in a rolled-back transaction).
- DB: RLS audit for payer_catalog, aliases, adopters and the payer_choices() function (CLAUDE.md DB Testing Protocol).
- U6: chart month range and `settled` flags; get_rate_card row kinds.
- U3 tool level: add_payer match / candidates / same_as alias / new entry; import_payouts and set_rate_card resolve via getPayerChoices.
- Lag lookup returns the same values before and after the catalog switch (EAP 30, Cash 7, Grow 14, Aetna 18).
- Migration: CHECK and unique constraints accept existing rows (dry run in a rolled-back transaction).
- R1 fixture is synthetic (no real payout data in tests).


## NOT in scope
- E1 Therapay-rendered chart UI (deferred, TODO).
- E5 underpayment check (deferred, TODO 1).
- U7 website redesign: its own design session.
- Peer cohort benchmarking (binding decision: deferred until density).

## Dependencies and sequencing
- Migration (CPT widening, modality, tax_set_aside_pct, payer_catalog + function) before tools.
- Built all at once (S1). Two PRs that can run in parallel: (1) MCP + pacing + catalog (R1, E2–E4, U1–U6); (2) /guides pages (U8).

## 0I. Implementation sequence (human-team / CC + gstack)
```
HOUR 1 (foundations):   migration: CPT/modality constraints + unique keys, therapists columns
                         (tax_set_aside_pct, session_length_confirmed, profile_skipped),
                         payer_catalog + aliases + adopters + RLS + submit_payer()/payer_choices(), seed with lags
                         (human ~1 day / CC ~30 min)
HOUR 2-3 (core logic):  lib/pacing.ts R1, E2, E3, E4, U6 chart, modality fallback; lib/planning.ts codes
                         (human ~2 days / CC ~1.5h) — ambiguity to watch: add-on vs session classification
HOUR 4-5 (integration): getPayerChoices() routed through 5 call sites; add_payer, get_profile, get_started,
                         get_rate_card, plan_time_off tools; prompts + instructions (U4, U5, U6)
                         (human ~2 days / CC ~1.5h) — surprise risk: resolveName first-word removal changes matching
HOUR 6+ (polish/tests): Vitest per item, RLS audit, migration dry run, live MCP run; /guides pages (parallel PR)
                         (human ~2 days / CC ~1.5h)
```
Feasibility blockers: none open. Pending implementation choices: none (all settled in the ledger).

## Review sections (CEO review)
- **S1 Architecture: OK.** Only new cross-user state is payer_catalog; row scoping (round 3) bounds it. Platform potential: consistent payer naming enables peer benchmarking later.
- **S2 Error & rescue: OK.** New tools follow `fail()` messages; catch-all try/catch returns the message to the model (accepted pattern). OBS1 adds the missing production record.
- **S3 Security: 2 findings → SEC1, SEC2 (approved).** Authorization: all new tables RLS-scoped to the caller's therapist; catalog writes only through submit_payer().
- **S4 Data flow & edge cases: OK.** Idempotent re-entry: log_month upsert, add_payer resolves to existing entry, set_goal no-op.
- **S5 Code quality: OK.** One lookup (getPayerChoices) replaces five call sites; resolveName first-word fallback removed for catalog lookups.
- **S6 Tests: OK.** Per-item Vitest list + RLS audit + migration dry run + SEC1/SEC2 tests.
- **S7 Performance: OK.** Per-user queries over hundreds of rows; payer_catalog.normalized unique index.
- **S8 Observability: 1 finding → OBS1 (approved).**
- **S9 Deployment: WARNING.** Changing payer_rates/monthly_volume unique keys breaks the old code's upserts until deploy: apply the migration immediately before deploying. Rollback: revert the deploy; the migration is additive except the key change (restore old unique keys by migration if needed).
- **S10 Trajectory: OK.** Catalog is the one hard-to-reverse piece (reversibility 3/5); additive.
- **S11 Design & UX: /guides only.** Static help pages; should adopt the U7 redesign when it lands. /plan-design-review not needed now.

## Outside voice (Claude subagent, Codex not installed) — dispositions
- C1/C2 → X1, X1a (R1 replaced). H1 → X2 declined. H2/H3 → X3. H4 → X4. M3 → applied. M4 → applied. M6 → applied (S1 reopened). M5 → declined.
- Corrections inside approved scope (no new behavior): **H5** December lump removed (X1a keeps 12 − settled months). **M1** E3: weeks where last year's same weeks earned < 50% of pace are treated as already in the seasonal projection (no extra loss, noted); time off within the last L days of December is excluded as next-year cash (noted). **M2** taxes labeled "cash by payout date" vs pacing "by work month".
- Not adopted: M7 (add-on revenue in blended rate) — add-ons stay excluded per U2; L1 prescriber codes kept (founder listed them); L3 modality kept (U2 approved).

## NOT in scope
- E1 Therapay-rendered chart UI (TODO). E5 underpayment check (TODO 1). U7 website redesign (own design session). Peer benchmarking (binding). Shrunk catalog (X2 declined). Host chart probe (M5 declined).

## Failure modes registry
| Path | Failure | Covered by | User sees |
|---|---|---|---|
| check_in levers | Total read as extra (the 98 case) | X1a + test | current vs needed + gap |
| imports | Same payouts imported twice with different dates | X1b + test | "possible duplicate payouts in import <id>" |
| levers | Counts or rates wrong vs cash | X1c | data note to check counts/rates |
| add_payer | Injection text / spam / person name | SEC1, SEC2, vetting, X3 fixture | clear rejection message |
| payer_choices | Provisional names leak cross-user | round-3 row scoping + test | nothing leaks |
| deploy | Unique-key change breaks old upserts | apply migration right before deploy (S9) | brief window, one user |
| logging | User text in logs | X4 error codes only | n/a |
Critical gaps: 0.

## Implementation Tasks
- [ ] **T1 (P1, human ~1 day / CC ~45 min)** — PR A: levers framing (X1a), duplicate-payout flag (X1b), counts-vs-cash note (X1c), U4 instruction line; tests pin the founder-shaped case. Files: lib/pacing.ts, lib/imports.ts, lib/mcp/import-tools.ts, lib/mcp/planning-tools.ts, app/api/mcp/route.ts. Verify: npm test, live check_in as test user.
- [ ] **T2 (P1, human ~1 day / CC ~30 min)** — PR B migration: CPT/modality CHECK + unique keys (keep '' cpt row), therapists columns, payer_catalog + aliases + adopters + RLS + submit_payer()/payer_choices() (row scoping, SEC1, SEC2, seeded lags + ~150 known payers), tool_call_logs verify. Verify: RLS audit, rolled-back dry run.
- [ ] **T3 (P1, human ~2 days / CC ~1.5h)** — PR B pacing: E2 taxes, E3 plan_time_off (M1 corrections), E4 highlights, U6 chart data, U2 codes/modality fallback/add-on revenue.
- [ ] **T4 (P1, human ~2 days / CC ~1.5h)** — PR B tools: getPayerChoices across 5 call sites (X3 fallback), add_payer, get_rate_card, get_started, setup_profile missing/skip (M3, M4), OBS1 logging wrapper (X4), prompts + instructions (U5, U6).
- [ ] **T5 (P2, human ~1 day / CC ~45 min)** — /guides pages (U8) + links; Gemini only after verification. Parallel PR.
- [ ] **T6 (P2, CC ~15 min)** — Founder data fix: undo duplicate import e116c9cd (5 Friday payouts, Oct 2–30) — user action or with explicit OK.

## Completion summary
- Mode: SELECTIVE EXPANSION. Scope: 11 accepted + X1a/X1b/X1c + SEC1/SEC2/OBS1(X4); deferred E1, E5; U7 own session.
- Spec review: 3 rounds (5→7→9), round-3 blocker fixed, issues verified 5 of 5.
- Reality rows: 7/7, unverified premises 1 (host chart rendering; probe declined).
- Sections 1–11: 3 findings needing decisions (SEC1, SEC2, OBS1), 1 warning (S9 deploy order), Section 11 limited to /guides.
- Outside voice: Claude subagent (Codex unavailable), 13 findings, all dispositioned.
- Failure modes: 0 critical gaps. Unresolved decisions: 0. TODOs added: E1.
- Approval readiness: PASS (all ledger rows cite founder answers of 2026-11-04).

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES OPEN | 14 proposals, 14 accepted (incl. repairs/fixes), 2 deferred, 1 own session |
| Outside Review | native fallback (Codex not installed) | Independent 2nd opinion | 1 | unavailable (in-host completed) | 13 findings, all dispositioned |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex unavailable (not installed); native Claude subagent completed (13 findings) — not counted as outside coverage.
- **VERDICT:** CEO review complete (scope decided, mapped to T1–T6); eng review required before building PR B.

NO UNRESOLVED DECISIONS
