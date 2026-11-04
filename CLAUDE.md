# Therapay — Claude Instructions

## SCOPE: Full repo

### Own:
- `app/` — all routes (app, marketing, login, api)
- `components/` — all components including marketing
- `lib/`, `proxy.ts`

---

## App Overview
Therapay helps 1099 therapists answer "am I on track this year?". **The product lives inside Claude and ChatGPT** through the
MCP server; the web app is only the front door (marketing, login, `/account`, `/connect`, OAuth consent). Don't add product
functionality to the web app — build it as MCP tools/prompts.

**Data rules:**
- **Income = payouts only** (Stripe/platform deposits in `payouts`). Nothing else is ever added to income.
- **No session-level data.** No per-appointment rows, dates or per-session CPT codes, and no free text that could hold client
  details. Payer × CPT rates and monthly counts (planned) are for mix analysis only. The `sessions`, `chat_sessions` and
  `recommendations` tables were dropped (migration `20261104000000`).
- Design: `docs/designs/am-i-on-track-check-in.md`; open items in `TODOS.md`.

## MCP Server (Claude / ChatGPT connectors)
Therapay is usable from inside Claude or ChatGPT through an MCP server at `/api/mcp` (Streamable HTTP, `mcp-handler` v2).
- `app/api/mcp/route.ts` — handler wrapped in `withMcpAuth`; every request needs a Supabase access token
- `lib/mcp/auth.ts` — verifies the token (`auth.getClaims`) and builds a Supabase client *as that user* (RLS applies; no service-role key)
- `lib/mcp/tools.ts` — `setup_profile` (shared write logic in `lib/therapists.ts`)
- `lib/mcp/import-tools.ts` — payout history: `import_payouts` (dry run by default, per-row errors, ≤500 rows/call, chunks share
  a `batch_id`; rows that look like per-session records are rejected), `undo_import`, `list_imports`, `list_payouts`
- **Payouts:** every row has `source` and optional `import_batch_id` (deleting an `import_batches` row cascades = undo). Overlap
  with existing payouts of the same payer/date range is a warning; Stripe `po_` IDs are unique per therapist and repeats are
  skipped in both dry run and real import (`lib/imports.ts` `splitDuplicates`).
- `lib/mcp/planning-tools.ts` — `check_in` (am I on track?), `set_rate_card` (payer × CPT code, with history), `log_month`
  (counts per payer × CPT + no-shows, upsert), `set_goal` (dollar target or growth %, numbers only, `lib/planning.ts`)
- `lib/pacing.ts` — the check-in math, **payouts only**: monthly series by work month (payout date − lag per paying entity),
  settled cutoff (month end + max lag), seasonal/run-rate projection, levers priced from the rate card. Pure functions,
  tested in `lib/pacing.test.ts` (`npm test`, Vitest).
- `lib/mcp/prompts.ts` — MCP prompts: Set up Therapay, Monthly check-in, Am I on track?
- `app/.well-known/oauth-protected-resource/[[...resource]]/route.ts` — RFC 9728 metadata pointing at `${SUPABASE_URL}/auth/v1`
- `app/oauth/consent/` — consent screen for Supabase Auth's OAuth 2.1 server (logged-out users go to `/login?next=...`)
- **Front door:** `/login` is the shared sign-in/sign-up page — email + password (signup confirms via `/auth/confirm`).
  Both land on `/connect`; a future pay step goes between them. `/auth/callback` (PKCE code exchange +
  `ensureTherapist` fallback) is ready for magic links or social providers if they're added later.
  `/connect` polls `/api/connections`; `/account` shows sign-in methods, AI apps (Supabase OAuth grants, revocable),
  sign out and delete (`delete_my_account()` RPC).
- **Connection status:** `verifySupabaseToken` records `(user, client_id)` in `mcp_connections` for OAuth-issued tokens
  (`lib/connections.ts`, throttled to one write per 5 min per instance).
- Supabase's auth server supports DCR but not CIMD, so Claude users pick **Register automatically**.
- **Privacy:** never add a free-text field to a tool that writes data; payer names are validated against reference lists.
- **Supabase dashboard setup (one-time):** Authentication → OAuth Server → enable, allow dynamic client registration,
  authorization path `/oauth/consent`; Site URL must be the deployed origin.
- **Testing locally:** the tools accept a normal Supabase session token too. Log in at localhost as a test user, take
  `access_token` from the `sb-…-auth-token` cookie, and call the endpoint with `Authorization: Bearer <token>`
  (MCP Inspector: `npx @modelcontextprotocol/inspector`, transport Streamable HTTP, URL `http://localhost:3000/api/mcp`).

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (`new-york` style, Radix UI primitives) + Lucide React
- **MCP:** `mcp-handler` + `@modelcontextprotocol/server`, zod 4
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

## Environment Variables
- All secrets go in `.env.local` (gitignored)
- Prefix client-side vars with `NEXT_PUBLIC_`
- Server-only vars (like `ANTHROPIC_API_KEY`) have no prefix
- Never import env vars in client components

## Auth
- **Library:** Supabase Auth via `@supabase/ssr` — Auth.js has been removed
- **Route protection:** `proxy.ts` calls `supabase.auth.getUser()`; public paths are listed in `PUBLIC_PATHS`
- **Login flow:** `supabase.auth.signInWithPassword({ email, password })` in the client — sets session cookie automatically via `@supabase/ssr`
- **Session reading:** `createSupabaseServerClient()` from `lib/supabase-server.ts` + `supabase.auth.getUser()` in Server Components
- **Test accounts:** sarah@therapay.dev, marcus@therapay.dev, jordan@therapay.dev (all use `password123`) — exist in both `auth.users` and the `therapists` data table in Supabase
- **Manual auth user inserts via SQL** require empty strings (not NULL) for: `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `email_change` — and a matching row in `auth.identities`
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in `.env.local`

## Proxy (Middleware)
- File is `proxy.ts` at project root (Next.js 16 convention — do not name it `middleware.ts`)
- Export must be named `proxy` (not `middleware`)
- Uses `supabase.auth.getUser()` to check authentication
- Public paths: see `PUBLIC_PATHS` (exact match or `/prefix/`)

## Testing After Changes

After any change, verify with this sequence before calling it done:

```bash
# 1. Build check
npm run build
```

```
# 2. MCP changes: call the tool through /api/mcp with a test user's token (see "Testing locally" above)
# 3. Front-door UI changes: Paul verifies UI himself; check only the page you changed
```

```bash
# 4. Auth e2e test (Supabase) — for auth/data changes
curl -s -X POST "https://pbijbpfgmcbtipuebsnn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@therapay.dev","password":"password123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'access_token' in d else d)"

# 5. Check dev server logs (server component console.log goes here, NOT to /tmp)
tail -20 .next/dev/logs/next-development.log
```

> **Note:** Server component `console.log` output goes to `.next/dev/logs/next-development.log`, not to any file captured by `npm run dev > /tmp/...`. The `/tmp` redirect only captures the initial startup banner.

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

**5. RLS smoke test with a real JWT**: call an MCP tool that reads/writes the table as a test user and check it only sees its own rows.

## Common Commands
```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # Run ESLint
npm test          # Vitest unit tests (lib/**/*.test.ts)
npx shadcn@latest add <component>  # Add a shadcn component
```

