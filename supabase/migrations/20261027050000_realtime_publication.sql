-- Live panel refresh: stream changes to the user's own rows (RLS applies to Realtime subscribers)
alter publication supabase_realtime add table public.sessions, public.goals, public.therapists, public.recommendations;
