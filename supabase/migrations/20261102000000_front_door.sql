-- Front door: social sign-in, connection status for AI apps, self-service account deletion.

-- New users from Google/Apple/Microsoft carry their name as full_name or name, not display_name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.therapists (user_id, name, avg_session_duration)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    ),
    50
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- One row per (user, OAuth client) the MCP server has seen a valid token from.
-- Written by the MCP server as the user; drives "Connected" on /connect and /account.
create table public.mcp_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, client_id)
);

alter table public.mcp_connections enable row level security;

create policy "users read own connections" on public.mcp_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users record own connections" on public.mcp_connections
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own connections" on public.mcp_connections
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own connections" on public.mcp_connections
  for delete to authenticated using (user_id = (select auth.uid()));

-- Deletes the caller's account and everything under it. therapists.user_id doesn't cascade,
-- so remove the profile first (its sessions, payouts and imports cascade from it); the rest of
-- the user's rows cascade from auth.users.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.therapists where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
