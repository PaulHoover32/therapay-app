-- Per-request usage for cost tracking and daily caps (written server-side by the chat and TTS routes)
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chat', 'tts')),
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  characters integer not null default 0,
  created_at timestamptz not null default now()
);

create index usage_events_user_kind_created_idx on public.usage_events (user_id, kind, created_at desc);

alter table public.usage_events enable row level security;

create policy "users read own usage" on public.usage_events
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own usage" on public.usage_events
  for insert to authenticated with check (auth.uid() = user_id);
