# TODOS

## Rebuild reconciliation as the rate-card vs payouts underpayment check
- **What:** Compare rate card × monthly payer/CPT counts against payouts per platform-month and flag when cash runs persistently below prediction (denials, no-shows, underpayment). Compare only — never add expected into income.
- **Why:** `get_reconciliation` is retired in the rate-card check-in build; this is roadmap item "rate card vs Stripe check".
- **Pros:** Catches money she's owed; reuses rate card + counts. **Cons:** Needs a couple of months of counts before it says anything.
- **Context:** Retired with the old session-based reconciliation (eng review 2026-11-03, D15). Start from `lib/pacing.ts` payout series + the planning-inputs module.
- **Depends on:** Rate-card check-in build shipped; ≥2 months of her monthly counts.

## Payout arrival_date (bank date)
- **What:** Second date per payout — when money reached the bank — beside `payout_date`.
- **Why:** Cash-in-bank views and matching bank statements later.
- **Pros:** Small migration. **Cons:** No consumer today (deferred in eng review D1).
- **Context:** Stripe Express exports carry an arrival date; today `import_payouts` maps it to `payout_date`.
- **Depends on:** Nothing.

## Package setup and check-in guidance as a Claude Skill
- **What:** A downloadable SKILL.md teaching Claude Therapay's setup, monthly check-in and data-source guidance.
- **Why:** Chat-first direction ("MCPs and Skills") if MCP prompts prove too limited.
- **Pros:** Works offline of prompt support. **Cons:** Another artifact to version.
- **Context:** This build ships 3 MCP prompts + server instructions first.
- **Depends on:** Watching how the MCP prompts work for user zero.
