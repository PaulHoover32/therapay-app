-- ⚠️ NOT YET APPLIED to the remote project. Review the retention windows below, then apply
-- (e.g. `supabase db push` or the Supabase SQL editor). Deleted rows are unrecoverable.
-- Transcript retention: deleted conversations are purged after 30 days, all conversations after
-- 365 days, and tool-call logs after 365 days. Runs nightly via pg_cron.
create extension if not exists pg_cron;

create or replace function public.purge_expired_transcripts()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.chat_sessions where archived_at < now() - interval '30 days';
  delete from public.chat_sessions where updated_at < now() - interval '365 days';
  delete from public.tool_call_logs where created_at < now() - interval '365 days';
$$;

-- Only the scheduler runs this
revoke execute on function public.purge_expired_transcripts() from public, anon, authenticated;

select cron.schedule('purge-expired-transcripts', '17 3 * * *', 'select public.purge_expired_transcripts()');
