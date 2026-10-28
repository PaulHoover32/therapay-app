# Therapay — Claude Instructions

## App Overview
Therapay is a voice-first, chat-native income planner for 1099 therapists (Headway, Alma, Grow…).
The whole signed-in app is one conversation: the user talks or types, the assistant answers (out loud
for spoken turns), reads/writes their Supabase data through tools, and drives a side panel of views.

## Ground rules
- **Privacy:** client names must never leave the browser. Every outgoing message (typed, spoken, starter)
  goes through on-device redaction (`lib/privacy/*`, run in `lib/voice/ml.worker.ts`) → `[NAME]` placeholders.
  Never add a code path that sends user text or audio to a server before `redactText()`.
- **Writes need approval:** any tool that changes data sets `needsApproval: true` and is listed in
  `lib/ai/write-tools.ts`. The user confirms on a card (or says yes/no); deletes are click-only.
- **Panel and assistant must agree:** analytics numbers come from the named SQL in
  `lib/analytics/queries.ts`, used by both panel views and tools. Don't compute metrics in components or prompts.

## Routes
- `/chat`, `/chat/[id]` — the workspace (history sidebar · conversation · side panel). `app/(workspace)/`
- `/settings` — photo, email, password reset, theme, today's usage
- `/`, `/about`, `/pricing`, `/login`, `/auth/confirm` — public
- `/dashboard`, `/planner` → `/chat`; `/profile` → `/settings` (redirects in `next.config.ts`)
- API: `/api/chat` (agent), `/api/analytics` (named queries; POST = guarded ad-hoc SELECT for charts),
  `/api/tts` (optional Cartesia; browser voices otherwise)

## Layout of the code
```
app/api/chat/route.ts        thin handler: auth → caps → context → streamText → save thread + tool logs
lib/ai/config.ts             models, step limit, TTS, daily caps — the one place to switch models
lib/ai/prompt.ts             system prompt
lib/ai/tools/*               one file per tool; index.ts registers them and logs every call
lib/ai/write-tools.ts        which tools change data (shared client/server)
lib/analytics/queries.ts     named SQL over the in-memory analytics DB (lib/userDb.ts, sql.js)
lib/threads.ts               list/load/save conversations (server-side; titles via cheap model)
lib/transcript-crypto.ts     AES-256-GCM for stored conversations (TRANSCRIPT_ENCRYPTION_KEY)
lib/sessions.ts              server-side session insert/update/delete
lib/usage.ts                 usage_events + daily caps
lib/privacy/*                NER redaction config + pure redaction helpers
lib/voice/*                  ML worker (NER + Whisper), mic capture, VAD, speaker queue
hooks/use-voice.ts           push-to-talk, hands-free, barge-in, speaking replies
hooks/use-analytics.ts       panel data fetching (refetches on panel invalidate)
hooks/use-live-data.ts       Supabase Realtime → panel refresh
components/workspace/*       shell, history sidebar, header
components/conversation/*    thread, composer, voice controls/status, confirmation cards
components/panel/*           side panel + views (summary, sessions, goal, profile, chart)
components/settings/*        settings sections
components/assistant-ui/*    vendored assistant-ui pieces (markdown, reasoning, tool group/fallback)
```

## Adding a tool
1. Create `lib/ai/tools/<name>.ts` exporting `(ctx: ToolContext) => tool({...})` with a zod `inputSchema`.
2. Register it in `lib/ai/tools/index.ts` (logging is automatic).
3. If it writes data: `needsApproval: true`, add it to `WRITE_TOOLS`, and add a case to
   `components/conversation/tool-ui/describeWrite.ts` so the card shows exactly what will be saved.
4. If it reads analytics: add a named query to `lib/analytics/queries.ts` and use `runNamedQuery`.
5. Mention when to use it in `lib/ai/prompt.ts`.

## Adding a panel view
Add the id to `PANEL_VIEWS` in `lib/panel-views.ts`, a component in `components/panel/views/`, a case in
`SidePanel.tsx`, and a line in the prompt's "Screen Control" section.

## Data
- Supabase Postgres, RLS on every table (all policies trace to `auth.uid()`). Migrations live in
  `supabase/migrations/` — apply new ones with the Supabase MCP (`apply_migration`) and keep the file in sync.
- Tables: `therapists`, `sessions`, `goals`, `recommendations`, `chat_sessions` (title, updated_at,
  archived_at; `messages` is an encrypted envelope), `tool_call_logs`, `usage_events`, `subscriptions`,
  `reference_*`.
- `save_goal_recommendation()` saves a recommendation + swaps the active goal atomically.
- Regenerate `lib/database.types.ts` after schema changes (Supabase MCP `generate_typescript_types`).
- `20261027070000_transcript_retention.sql` is intentionally **not applied** yet (needs owner review).

## Conventions
- Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui (`new-york`), Lucide.
- `proxy.ts` (not middleware.ts) guards routes; public paths match exactly or by `/prefix/`.
- Server Components by default; `"use client"` only for interactivity.
- Tailwind only; inline `style` only for data-driven values (bar widths).
- Charts: shadcn `ChartContainer` + `ChartConfig` (see `components/panel/AnalyticsChart.tsx`).
  Pass Recharts axes as an array, not a fragment.
- `components/ui/*` is shadcn-managed — add with `npx shadcn@latest add <name>`, don't hand-edit.
  (New shadcn versions import `cn` from a `cn` package; change it to `@/lib/utils`.)

## Environment
`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `ANTHROPIC_API_KEY`,
`TRANSCRIPT_ENCRYPTION_KEY` (32 bytes base64; must also be set in Vercel), optional `CARTESIA_API_KEY`,
`CARTESIA_VOICE_ID`. If your shell exports `ANTHROPIC_BASE_URL` without `/v1`, unset it before `npm run dev`.

## Testing after changes
```bash
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm run check:redaction   # after touching lib/privacy (downloads the NER model on first run)
```
- UI changes: run the dev server and test in the browser as sarah@therapay.dev / password123
  (also marcus@ and jordan@therapay.dev). Test only what changed.
- Privacy: type a message with a fake client name and confirm the stored thread contains `[NAME]`.
- Writes: trigger the tool, check the card, Cancel → no row; Confirm → one row; a `tool_call_logs` row each time.
- Voice needs a real mic; verify transcription with `__therapayMl.transcribeAudio` in dev if needed.
