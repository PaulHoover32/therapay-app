-- Conversation history: titles, recency ordering, soft delete
alter table public.chat_sessions
  add column if not exists title text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz;

update public.chat_sessions set updated_at = created_at where updated_at > created_at;

create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

create index if not exists chat_sessions_user_recent_idx
  on public.chat_sessions (user_id, updated_at desc)
  where archived_at is null;

-- UPDATE policy had no WITH CHECK; make ownership explicit on both sides
alter policy "users update own sessions" on public.chat_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
