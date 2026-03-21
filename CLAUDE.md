# Therapay — Claude Instructions

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
- **Library:** Auth.js v5 (`next-auth@beta`) with Credentials provider
- **Session cookie:** `authjs.session-token` (dev) / `__Secure-authjs.session-token` (prod) — Auth.js v5, not v4
- **Route protection:** `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, export must be named `proxy`)
- **Login flow:** client fetches `/api/auth/csrf`, then POSTs to `/api/auth/callback/credentials` with `{ email, password, csrfToken }` — this is the only approach confirmed to set the session cookie correctly
- **Server actions cannot create sessions** — `signIn` with `redirect: false` in a server action does not set the session cookie; always use the callback endpoint via fetch
- **Session reading:** `auth()` from `@/auth` in Server Components; `SessionProvider` from `next-auth/react` wraps the layout via `components/Providers.tsx`
- **Fake accounts:** defined in `lib/accounts.ts` — sarah@therapay.dev, marcus@therapay.dev, jordan@therapay.dev (all use `password123`)
- **Auth config:** `auth.ts` at project root; API handler at `app/api/auth/[...nextauth]/route.ts`
- **`AUTH_SECRET`** must be set in `.env.local`

## Proxy (Middleware)
- File is `proxy.ts` at project root (Next.js 16 convention — do not name it `middleware.ts`)
- Export must be named `proxy` (not `middleware`)
- Checks for `authjs.session-token` cookie to determine if user is authenticated
- Public paths: `/login`, `/api/auth`

## Testing After Changes
After any server-side change, verify with this sequence before calling it done:
```bash
# 1. Build check
npm run build

# 2. Start dev server with log capture
npm run dev > /tmp/therapay-dev.log 2>&1 &

# 3. Auth e2e test
CSRF=$(curl -s -c /tmp/t.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=sarah@therapay.dev&password=password123&csrfToken=$CSRF&callbackUrl=http://localhost:3000/" \
  -b /tmp/t.txt -c /tmp/t.txt -L -w "\nHTTP:%{http_code}" -o /dev/null

# 4. Check logs
cat /tmp/therapay-dev.log | tail -20
```

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
