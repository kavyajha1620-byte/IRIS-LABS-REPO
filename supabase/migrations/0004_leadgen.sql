-- =============================================================
-- 0004 — Lead generation, scoring, assignment, tags & dedupe
-- =============================================================

-- -------------------------------------------------------------
-- Leads: richer business data + lead quality + dedupe keys
-- -------------------------------------------------------------
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists "state" text;
alter table public.leads add column if not exists latitude double precision;
alter table public.leads add column if not exists longitude double precision;
alter table public.leads add column if not exists source_url text;
alter table public.leads add column if not exists source_id text;
alter table public.leads add column if not exists lead_score integer not null default 0;
alter table public.leads add column if not exists lead_score_reasons jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists tags text[] not null default '{}';

-- Normalized dedupe fingerprints (computed in code before insert).
alter table public.leads add column if not exists fp_domain text;
alter table public.leads add column if not exists fp_phone text;
alter table public.leads add column if not exists fp_name_city text;
alter table public.leads add column if not exists fp_name_address text;

-- Hard global dedupe: the same business can never exist twice.
create unique index if not exists leads_fp_domain_uidx on public.leads(fp_domain) where fp_domain is not null;
create unique index if not exists leads_fp_phone_uidx on public.leads(fp_phone) where fp_phone is not null;
create unique index if not exists leads_fp_name_city_uidx on public.leads(fp_name_city) where fp_name_city is not null;
create unique index if not exists leads_fp_name_address_uidx on public.leads(fp_name_address) where fp_name_address is not null;

create index if not exists leads_lead_score_idx on public.leads(lead_score desc);
create index if not exists leads_tags_gin_idx on public.leads using gin (tags);
create index if not exists leads_state_idx on public.leads("state");
create index if not exists leads_source_url_idx on public.leads(source_url);

-- -------------------------------------------------------------
-- Status lifecycle: add Qualified and Do Not Contact.
-- (Keeps the existing values; a migration for the exact same
--  lifecycle the cold-calling process needs.)
-- -------------------------------------------------------------
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (status in (
  'New', 'Not Called', 'Called', 'No Answer', 'Interested', 'Follow-up',
  'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost',
  'Not Interested', 'Wrong Number', 'Qualified', 'Do Not Contact'
));

-- Activities: allow logging assignment events.
alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'lead_created', 'call', 'status', 'followup', 'note', 'email',
  'imported', 'task', 'meeting', 'assigned'
));

-- -------------------------------------------------------------
-- Lead generation jobs history
-- -------------------------------------------------------------
create table if not exists public.lead_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'apify',
  country text,
  state text,
  city text,
  industry text,
  requested_count integer not null default 0,
  found_count integer not null default 0,
  valid_count integer not null default 0,
  duplicate_count integer not null default 0,
  imported_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  error text,
  progress_log jsonb not null default '[]'::jsonb,
  params jsonb not null default '{}'::jsonb,
  actor_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists lead_generation_jobs_user_id_idx on public.lead_generation_jobs(user_id);
create index if not exists lead_generation_jobs_status_idx on public.lead_generation_jobs(status);
create index if not exists lead_generation_jobs_created_at_idx on public.lead_generation_jobs(created_at desc);

create trigger trg_lead_generation_jobs_updated_at before update on public.lead_generation_jobs
  for each row execute function public.set_updated_at();

alter table public.lead_generation_jobs enable row level security;
create policy "jobs select own" on public.lead_generation_jobs
  for select using (auth.uid() = user_id);
create policy "jobs insert own" on public.lead_generation_jobs
  for insert with check (auth.uid() = user_id);
create policy "jobs update own" on public.lead_generation_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jobs delete own" on public.lead_generation_jobs
  for delete using (auth.uid() = user_id);
create policy "jobs admin select" on public.lead_generation_jobs
  for select using (public.is_admin_or_owner());

-- -------------------------------------------------------------
-- Activity helper: writes under the lead's owner so the timeline
-- is visible to the caller who owns the lead (also lets admins
-- log assignments/imports on leads they manage).
-- -------------------------------------------------------------
create or replace function public.insert_activity(
  p_lead_id uuid,
  p_type text,
  p_title text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.leads where id = p_lead_id;
  if v_owner is null then
    raise exception 'lead not found';
  end if;
  if auth.uid() = v_owner or public.is_admin_or_owner() then
    insert into public.activities (lead_id, user_id, type, title, description, metadata)
    values (p_lead_id, v_owner, p_type, p_title, p_description, p_metadata);
  else
    raise exception 'not allowed';
  end if;
end $$;

-- -------------------------------------------------------------
-- SECURITY: drop the wide-open "service select/delete (true)"
-- policies added in 0001. They let ANY authenticated user select
-- or delete everyone's rows. The service role and direct SQL
-- bypass RLS regardless, so removing them loses nothing.
-- -------------------------------------------------------------
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public' and policyname like '% service %' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;