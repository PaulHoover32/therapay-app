-- Remove the legacy web app's data: Therapay stores no per-session records and no free-text
-- chat or recommendation content. Income comes from payouts only; everything else runs in
-- Claude/ChatGPT through the MCP server. (Eng review 2026-11-03: D4, D7, D15, D16.)

-- Session-grain import batches (their session rows go with the sessions table below)
delete from public.import_batches where grain = 'session';

alter table public.import_batches drop constraint import_batches_grain_check;
alter table public.import_batches
  add constraint import_batches_grain_check check (grain = 'payout');

-- In-app chat and planner storage
drop function if exists public.save_goal_recommendation;
alter table public.tool_call_logs drop constraint if exists tool_call_logs_thread_id_fkey;
drop table public.chat_sessions;
drop table public.recommendations;

-- Per-session records (also leaves the realtime publication)
drop table public.sessions;
drop type if exists public.session_code;
