-- Audit log of every assistant tool call (inputs only ever contain redacted text)
create table public.tool_call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid references public.chat_sessions (id) on delete set null,
  tool_name text not null,
  status text not null check (status in ('success', 'error', 'denied')),
  input jsonb,
  output jsonb,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index tool_call_logs_user_created_idx on public.tool_call_logs (user_id, created_at desc);

alter table public.tool_call_logs enable row level security;

-- Users can read and append their own log; nobody updates or deletes through the API
create policy "users read own tool calls" on public.tool_call_logs
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own tool calls" on public.tool_call_logs
  for insert to authenticated with check (auth.uid() = user_id);
