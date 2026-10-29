-- Payout bulk import: cash received (payouts) stored apart from work performed (sessions),
-- grouped into import batches that can be undone as a unit. Scoped by therapist_id like sessions.

-- Platforms that pay providers in lump sums. payout_lag_days is how long after a session the
-- money typically lands; reconciliation uses it to attribute a payout to the month of work.
create table public.reference_platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  payout_lag_days integer not null default 14 check (payout_lag_days between 0 and 120),
  sort_order integer not null default 100,
  active boolean not null default true
);

alter table public.reference_platforms enable row level security;
create policy "authenticated read" on public.reference_platforms
  for select to authenticated using (true);

-- Grow: insurance ~14-21 days, cash pay ~7 days, paid out Fridays -> 14 as a blended default
insert into public.reference_platforms (name, payout_lag_days, sort_order) values
  ('Grow Therapy', 14, 1),
  ('Headway', 14, 2),
  ('Alma', 14, 3),
  ('Rula', 14, 4),
  ('SonderMind', 14, 5),
  ('Spring Health', 30, 6),
  ('Stripe', 2, 7),
  ('Other platform', 14, 99);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists (id) on delete cascade,
  source text not null default 'bulk_import',
  grain text not null check (grain in ('session', 'payout')),
  filename text,
  row_count integer not null default 0,
  inserted_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index import_batches_therapist_idx on public.import_batches (therapist_id, created_at desc);

create trigger import_batches_set_updated_at
  before update on public.import_batches
  for each row execute function public.set_updated_at();

-- No uniqueness: data is anonymized, so identical-looking rows are legitimate.
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists (id) on delete cascade,
  payer text not null,
  external_id text,
  payout_date date not null,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  period_start date,
  period_end date,
  status text not null default 'paid' check (status in ('paid', 'pending', 'failed', 'reversed')),
  source text not null default 'manual',
  import_batch_id uuid references public.import_batches (id) on delete cascade,
  raw jsonb,
  created_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start)
);

create index payouts_therapist_date_idx on public.payouts (therapist_id, payout_date desc);
create index payouts_batch_idx on public.payouts (import_batch_id) where import_batch_id is not null;

-- Sessions learn where they came from, which batch (if any) and which platform paid them,
-- so payouts from e.g. Grow can be matched to the Aetna/Cigna sessions held through Grow.
alter table public.sessions
  add column source text not null default 'manual',
  add column import_batch_id uuid references public.import_batches (id) on delete cascade,
  add column platform text;

create index sessions_batch_idx on public.sessions (import_batch_id) where import_batch_id is not null;

-- RLS: every row traces to the caller's therapist row
alter table public.import_batches enable row level security;
alter table public.payouts enable row level security;

create policy "therapists manage own import batches" on public.import_batches
  for all to authenticated
  using (therapist_id in (select id from public.therapists where user_id = (select auth.uid())))
  with check (therapist_id in (select id from public.therapists where user_id = (select auth.uid())));

create policy "therapists manage own payouts" on public.payouts
  for all to authenticated
  using (therapist_id in (select id from public.therapists where user_id = (select auth.uid())))
  with check (therapist_id in (select id from public.therapists where user_id = (select auth.uid())));
