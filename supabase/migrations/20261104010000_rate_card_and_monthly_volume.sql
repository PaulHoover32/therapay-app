-- Rate card and monthly counts for payer-mix analysis, plus Stripe payout dedupe.
-- Income always comes from payouts; these tables are never added to it. No per-session rows:
-- the finest grain is payer x CPT code x month. (Design: docs/designs/am-i-on-track-check-in.md)

-- What each payer pays per CPT code, with history: a rate change is a new row with a later
-- effective_from. platform is '' for direct (not through a platform) so the key can be a plain
-- unique constraint.
create table public.payer_rates (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists (id) on delete cascade,
  payer text not null,
  platform text not null default '',
  cpt_code text not null check (cpt_code in ('90837', '90834', '90791', '90847', '90853')),
  rate numeric(10, 2) not null check (rate > 0 and rate <= 2000),
  effective_from date not null check (extract(day from effective_from) = 1),
  created_at timestamptz not null default now(),
  unique (therapist_id, payer, platform, cpt_code, effective_from)
);

-- Monthly counts per payer x CPT code. No-shows and late cancels aren't code-specific, so they
-- live on the payer's cpt_code = '' row (whose completed count stays 0).
create table public.monthly_volume (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  payer text not null,
  platform text not null default '',
  cpt_code text not null default '' check (cpt_code in ('', '90837', '90834', '90791', '90847', '90853')),
  completed integer not null default 0 check (completed between 0 and 500),
  no_shows integer not null default 0 check (no_shows between 0 and 500),
  late_cancels integer not null default 0 check (late_cancels between 0 and 500),
  late_cancel_fee numeric(10, 2) not null default 0 check (late_cancel_fee >= 0 and late_cancel_fee <= 2000),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (therapist_id, month, payer, platform, cpt_code)
);

create trigger monthly_volume_set_updated_at
  before update on public.monthly_volume
  for each row execute function public.set_updated_at();

alter table public.payer_rates enable row level security;
alter table public.monthly_volume enable row level security;

create policy "therapists manage own rates" on public.payer_rates
  for all to authenticated
  using (therapist_id in (select id from public.therapists where user_id = (select auth.uid())))
  with check (therapist_id in (select id from public.therapists where user_id = (select auth.uid())));

create policy "therapists manage own monthly volume" on public.monthly_volume
  for all to authenticated
  using (therapist_id in (select id from public.therapists where user_id = (select auth.uid())))
  with check (therapist_id in (select id from public.therapists where user_id = (select auth.uid())));

-- A Stripe payout ID is a real identity: never store the same po_ twice for one therapist.
-- Other sources' IDs (row numbers, bank refs) aren't unique, so they stay unconstrained.
create unique index payouts_stripe_payout_id_unique
  on public.payouts (therapist_id, external_id)
  where external_id like 'po\_%';
