# Therapay — Claude Instructions

## SCOPE: This window — authenticated app only

### Own:
- `app/(app)/` — dashboard and all app routes
- `app/login/` — login page
- `app/layout.tsx`, `app/globals.css` — root layout/styles
- `app/api/` — API routes
- `components/` (excluding `components/marketing/`)
- `lib/`, `proxy.ts`

### Do NOT touch:
- `app/(marketing)/` — owned by the marketing window
- `components/marketing/`

---

## App Overview
Therapay helps 1099 therapists track and project their earnings.

## Navigation
- **Sidebar:** shadcn `Sidebar` component, icon-rail style, `collapsible="icon"` (collapsed by default, expands on hover/toggle)
- **`/dashboard` is complete — do not modify it**
- Nav items: Dashboard (`/dashboard`), Intelligence (`/intelligence`), Planner (`/planner`); Profile (`/profile`) pinned to sidebar bottom
- Active route highlighted via `usePathname()`

## Data Layer
- **Shared data access:** always go through `lib/data.ts` — never fetch directly from pages
- `lib/seed-data.ts` holds mock data; `lib/data.ts` exports `getTherapistProfile()`, `getSessionLogs()`, `getSessionById(id)`, `getActiveGoal()`, `getRecommendations()`, `getTherapistContext()`
- Dashboard fetches sessions/payers/sessionCodes directly from Supabase, but uses `getActiveGoal()` from `lib/data.ts` for goal data; other pages use `lib/data.ts` throughout

## State Management
- **Zustand** stores are domain-scoped — one slice per route (e.g., `store/intelligence.ts`, `store/planner.ts`)
- Pages are modular and independently navigable by design — avoid cross-page state

## Global Chat System
- **Do not add** the chat button or panel to individual pages — they live in `app/layout.tsx` only
- `components/chat/ChatButton.tsx` — floating button (bottom-right, z-50), toggles panel
- `components/chat/ChatPanel.tsx` — 400×560px fixed panel, uses Vercel AI SDK `useChat`
- `components/chat/starters.ts` — conversation starter strings
- `store/chatStore.ts` — Zustand store: `isOpen`, `currentSessionId`, `hasRecommendation` + open/close/toggle/createSession/setHasRecommendation/clearSession
- **API route:** `app/api/chat/route.ts` — `streamText` with `claude-sonnet-4-6`, one tool: `saveGoals`
- `saveGoals` tool writes three tables in order: `recommendations` (insert) → `goals` (deactivate old + insert new) → `chat_sessions` (update recommendation_id)
- `sessionId` is passed from the client in the request body alongside `messages`; the API route uses it to link the session to the recommendation
- Therapist context (YTD revenue, velocity, weeks remaining, active goal) is fetched via `getTherapistContext()` in `lib/data.ts`

### Supabase Tables
- **goals:** `id, user_id, goal_year, annual_income_target, target_weekly_hours, target_avg_payout, is_active, last_modified_at, last_modified_by ('user'|'ai'), created_at` — one active row per user per year
- **recommendations:** append-only, never updated after insert — `id, user_id, goal_year, annual_income_target, target_weekly_hours, target_avg_payout, summary, reasoning, ytd_revenue_at_time, avg_weekly_hours_at_time, avg_payout_at_time, weeks_remaining_at_input, created_at`
- **chat_sessions:** `id, user_id, created_at, recommendation_id (nullable → recommendations.id), messages (jsonb [])` — sessions without a saveGoals outcome are deleted on chat close (client-side fire-and-forget via chatStore `close()`)

### Session Lifecycle
1. Chat open → nothing written to DB yet
2. First user message → `chatStore.createSession()` inserts a `chat_sessions` row; id stored in `currentSessionId`
3. `sessionId` sent in every request body so server can update `recommendation_id` after saveGoals
4. Chat close without recommendation → `chatStore.close()` deletes the session row (background, no await)
5. saveGoals fires → server updates `chat_sessions.recommendation_id`; client should call `setHasRecommendation()` to prevent delete on close

## /planner Page
- `app/(app)/planner/page.tsx` — server component, fetches `getActiveGoal` + `getRecommendations` and passes to client components
- `components/planner/GoalCard.tsx` — displays active goal with inline edit (3 fields); saves with `last_modified_by: 'user'`; shows toast on success
- `components/planner/RecommendationList.tsx` — renders list of RecommendationCard; empty state if none
- `components/planner/RecommendationCard.tsx` — date, context line, summary, 3 stats, collapsible reasoning, Apply button
- `components/planner/ApplyRecommendationDialog.tsx` — two-column comparison dialog; on confirm upserts goals table with `last_modified_by: 'ai'`

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (`new-york` style, Radix UI primitives) + Lucide React
- **Charts:** shadcn `chart` component (`ChartContainer`, `ChartTooltip`, etc.) wrapping Recharts
- **AI:** Anthropic TypeScript SDK + Vercel AI SDK
- **Package Manager:** npm
- **Theme:** Dark mode by default (`dark` class on `<html>`)

## App Router Conventions
- All components are **Server Components by default**
- Add `"use client"` only when the component needs browser APIs, event handlers, or React state/effects
- Data fetching happens in Server Components — pass data down as props
- API routes live in `app/api/[route]/route.ts`
- Layouts in `app/layout.tsx`, pages in `app/[route]/page.tsx`

## Styling Rules
- **Tailwind only** — no separate `.css` files, no CSS modules, no inline `style={{}}` objects
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Follow the shadcn/ui theming system (CSS variables in `globals.css`)

## Component Rules
- **Always reach for shadcn/ui first** before building a custom component
- Add shadcn components with: `npx shadcn@latest add <component>`
- Custom components go in `components/` — one component per file, named in PascalCase
- UI primitives go in `components/ui/` (managed by shadcn — do not edit these manually)
- This project uses the `new-york` style with standard Radix UI primitives — use `asChild` prop where needed

## Chart Rules
- **Always use the shadcn `chart` component** — never use raw Recharts components directly
- Add with: `npx shadcn@latest add chart`
- Always define a `ChartConfig` object and pass it to `ChartContainer`
- Use `var(--color-<key>)` for colors inside the chart (injected by `ChartContainer`)
- Use `ChartTooltip` + `ChartTooltipContent` for tooltips — never raw Recharts `<Tooltip>`
- Use `ChartLegend` + `ChartLegendContent` for legends
- Never pass `hsl(var(--chart-N))` directly to Recharts props — the CSS vars use oklch and can't be wrapped in `hsl()`
- Gradient fills use `<defs><linearGradient>` with `stopColor="var(--color-<key>)"`
- Example pattern:
  ```tsx
  const chartConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
  }
  // Inside JSX:
  <ChartContainer config={chartConfig}>
    <AreaChart data={data}>
      <Area dataKey="revenue" stroke="var(--color-revenue)" fill="url(#fillRevenue)" />
    </AreaChart>
  </ChartContainer>
  ```

## Environment Variables
- All secrets go in `.env.local` (gitignored)
- Prefix client-side vars with `NEXT_PUBLIC_`
- Server-only vars (like `ANTHROPIC_API_KEY`) have no prefix
- Never import env vars in client components

## Auth
- **Library:** Supabase Auth via `@supabase/ssr` — Auth.js has been removed
- **Route protection:** `proxy.ts` calls `supabase.auth.getUser()` to check session; public paths: `/login`
- **Login flow:** `supabase.auth.signInWithPassword({ email, password })` in the client — sets session cookie automatically via `@supabase/ssr`
- **Session reading:** `createSupabaseServerClient()` from `lib/supabase-server.ts` + `supabase.auth.getUser()` in Server Components
- **Test accounts:** sarah@therapay.dev, marcus@therapay.dev, jordan@therapay.dev (all use `password123`) — exist in both `auth.users` and the `therapists` data table in Supabase
- **Manual auth user inserts via SQL** require empty strings (not NULL) for: `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `email_change` — and a matching row in `auth.identities`
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in `.env.local`

## Proxy (Middleware)
- File is `proxy.ts` at project root (Next.js 16 convention — do not name it `middleware.ts`)
- Export must be named `proxy` (not `middleware`)
- Uses `supabase.auth.getUser()` to check authentication
- Public paths: `/login`

## Testing After Changes

After any change, verify with this sequence before calling it done:

```bash
# 1. Build check
npm run build
```

```
# 2. Puppeteer UI test — only for UI changes
- Only run Puppeteer when the change affects the UI (new components, modals, visual changes, etc.)
- Do NOT run a generic dashboard smoke test — test only the specific functionality that changed
- Navigate to the relevant page, interact with the changed component, and screenshot to confirm it works
- Log in as sarah@therapay.dev / password123 unless another account is more relevant
```

```bash
# 3. Auth e2e test (Supabase) — for auth/data changes
curl -s -X POST "https://pbijbpfgmcbtipuebsnn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@therapay.dev","password":"password123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'access_token' in d else d)"

# 4. Check dev server logs (server component console.log goes here, NOT to /tmp)
tail -20 .next/dev/logs/next-development.log
```

> **Note:** Server component `console.log` output goes to `.next/dev/logs/next-development.log`, not to any file captured by `npm run dev > /tmp/...`. The `/tmp` redirect only captures the initial startup banner.

### Puppeteer tips
- Use `mcp__puppeteer__puppeteer_navigate`, `mcp__puppeteer__puppeteer_click`, `mcp__puppeteer__puppeteer_screenshot`
- Click buttons by stable class selectors (e.g. `button.text-blue-500`), not by text content via JS evaluate — `evaluate` with `.click()` returns the DOM element and crashes the tab
- Always take a screenshot after opening a modal/dialog to confirm layout is correct before declaring done
- Supabase SSR session cookies are too complex to replicate via curl — Puppeteer is the only reliable UI test method

## DB Testing Protocol
After any migration that touches schema or RLS, run these checks before calling it done:

**1. Verify migration applied**
Use `mcp__supabase__execute_sql` to confirm new columns/policies exist.

**2. Audit RLS policies**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = '<table>' AND schemaname = 'public'
ORDER BY cmd;
```
Every policy that gates on user identity must trace back to `auth.uid()` via a stable FK — never via email or other mutable fields.

**3. Smoke test CRUD via SQL** (bypasses RLS — confirms schema only)
Run INSERT → UPDATE → DELETE with a known `therapist_id`. Verify `created_at` and `updated_at` are populated by the DB.

**4. Auth smoke test**
```bash
curl -s -X POST "https://pbijbpfgmcbtipuebsnn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@therapay.dev","password":"password123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'access_token' in d else d)"
```

**5. UI smoke test** (validates RLS with real JWT)
- Add a session → reload → verify it persists
- Edit the session → reload → verify change persists and `updated_at` updated
- Delete the session → verify it's gone

## Chat Testing Protocol

After any change to `app/api/chat/route.ts`, `lib/data.ts` (context), or the `goals` table:

**1. UI smoke test via Puppeteer** (curl cannot replicate Supabase SSR session cookies — use browser-based testing)
- Log in as sarah@therapay.dev via `mcp__puppeteer__*` tools
- Open chat panel and verify conversation starters appear

**2. Key behaviors to verify via Puppeteer UI test**
- Open chat panel → conversation starters appear
- Click a starter → message appears in thread, loading dots show, Claude responds
- Type a custom message → send → Claude responds
- Trigger goal-setting flow: click "Model scenarios and set goals" → answer Claude's questions → confirm → verify a row appears in the `goals` table
- Verify `saveGoals` tool call persists: run `SELECT * FROM goals WHERE user_id = '<sarah_user_id>'` after confirming a goal

**3. Verify `convertToModelMessages` is applied in route**
The v6 `useChat` client sends `UIMessage[]` (parts-based). The `streamText` function expects `ModelMessage[]`.
`app/api/chat/route.ts` must call `await convertToModelMessages(messages)` before passing to `streamText` — without it, Claude never responds and the server logs `AI_InvalidPromptError`.

**4. Goals table smoke test after saveGoals**
```sql
SELECT id, goal_year, annual_income_target, target_weekly_hours, target_avg_payout, is_active
FROM goals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sarah@therapay.dev')
ORDER BY created_at DESC
LIMIT 3;
```
Confirm: only one row has `is_active = true` per `goal_year`. Prior goals should have `is_active = false`.

## Common Commands
```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # Run ESLint
npx shadcn@latest add <component>  # Add a shadcn component
```

## AI Integration
- Use the Vercel AI SDK (`ai` package) for streaming responses in API routes
- Use the Anthropic SDK (`@anthropic-ai/sdk` package) for direct API calls
- AI routes go in `app/api/ai/[route]/route.ts`
- Always stream responses for chat/generation features
