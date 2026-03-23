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
After any server-side change, verify with this sequence before calling it done:
```bash
# 1. Build check
npm run build

# 2. Start dev server with log capture
npm run dev > /tmp/therapay-dev.log 2>&1 &

# 3. Auth e2e test (Supabase)
curl -s -X POST "https://pbijbpfgmcbtipuebsnn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@therapay.dev","password":"password123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'access_token' in d else d)"

# 4. Check logs
cat /tmp/therapay-dev.log | tail -20
```

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
