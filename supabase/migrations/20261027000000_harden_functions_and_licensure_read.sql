-- Pin search_path on functions flagged by the Supabase security advisor
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    50
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger-only SECURITY DEFINER functions should not be callable via /rest/v1/rpc
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- reference_licensures had RLS on but no policy, so the app could never read it
create policy "authenticated read"
  on public.reference_licensures
  for select
  to authenticated
  using (true);
