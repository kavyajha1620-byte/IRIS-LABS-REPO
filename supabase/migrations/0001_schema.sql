-- =============================================================
-- IrisLabs CRM — Database schema & Row Level Security
-- Run this in the Supabase SQL editor (first migration)
-- =============================================================

-- -------------------------------------------------------------
-- Extensions
-- -------------------------------------------------------------
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- Profiles (one row per auth user)
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'salesperson' check (role in ('owner', 'salesperson', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Leads
-- -------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  company text,
  job_title text,
  phone text,
  whatsapp text,
  email text,
  website text,
  country text,
  city text,
  industry text,
  source text,
  status text not null default 'New' check (status in (
    'New', 'Not Called', 'Called', 'No Answer', 'Interested', 'Follow-up',
    'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost',
    'Not Interested', 'Wrong Number'
  )),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_email_lowercase check (email is null or email = lower(email))
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_priority_idx on public.leads(priority);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_created_at_idx on public.leads(created_at);
create index if not exists leads_next_follow_up_idx on public.leads(next_follow_up_at);
create index if not exists leads_last_contacted_idx on public.leads(last_contacted_at);
create index if not exists leads_full_name_trgm_idx on public.leads using gin (full_name gin_trgm_ops);
create index if not exists leads_company_trgm_idx on public.leads using gin (coalesce(company, '') gin_trgm_ops);

-- -------------------------------------------------------------
-- Calls
-- -------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  called_at timestamptz not null default now(),
  duration_seconds integer,
  outcome text not null check (outcome in (
    'Interested', 'Not Interested', 'No Answer', 'Busy', 'Call Back Later',
    'Wrong Number', 'Meeting Booked', 'Other'
  )),
  notes text,
  follow_up_required boolean not null default false,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists calls_lead_id_idx on public.calls(lead_id);
create index if not exists calls_user_id_idx on public.calls(user_id);
create index if not exists calls_called_at_idx on public.calls(called_at);

-- -------------------------------------------------------------
-- Activities (timeline events for leads)
-- -------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'lead_created', 'call', 'status', 'followup', 'note', 'email',
    'imported', 'task', 'meeting'
  )),
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activities_lead_id_idx on public.activities(lead_id);
create index if not exists activities_user_id_idx on public.activities(user_id);
create index if not exists activities_created_at_idx on public.activities(created_at desc);

-- -------------------------------------------------------------
-- Notes (unlimited notes per lead)
-- -------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_lead_id_idx on public.notes(lead_id);
create index if not exists notes_created_at_idx on public.notes(created_at desc);

-- -------------------------------------------------------------
-- Follow-ups
-- -------------------------------------------------------------
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists follow_ups_lead_id_idx on public.follow_ups(lead_id);
create index if not exists follow_ups_user_id_idx on public.follow_ups(user_id);
create index if not exists follow_ups_due_at_idx on public.follow_ups(due_at);
create index if not exists follow_ups_status_idx on public.follow_ups(status);

-- -------------------------------------------------------------
-- Tasks
-- -------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'Pending' check (status in ('Pending', 'Completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_at_idx on public.tasks(due_at);

-- -------------------------------------------------------------
-- Notifications
-- -------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'followup_due', 'followup_overdue', 'meeting', 'task_due'
  )),
  title text not null,
  message text,
  lead_id uuid references public.leads(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);

-- -------------------------------------------------------------
-- Triggers: updated_at + contact timestamps + activity on follow-up
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create trigger trg_follow_ups_updated_at before update on public.follow_ups
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'owner')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.calls enable row level security;
alter table public.activities enable row level security;
alter table public.notes enable row level security;
alter table public.follow_ups enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

-- For the MVP everyone owns all their records via user_id.
-- (Future: change these to `assigned_to` for team-based access.)

create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "leads select own" on public.leads
  for select using (auth.uid() = user_id);
create policy "leads insert own" on public.leads
  for insert with check (auth.uid() = user_id);
create policy "leads update own" on public.leads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leads delete own" on public.leads
  for delete using (auth.uid() = user_id);

create policy "calls select own" on public.calls
  for select using (auth.uid() = user_id);
create policy "calls insert own" on public.calls
  for insert with check (auth.uid() = user_id);
create policy "calls update own" on public.calls
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calls delete own" on public.calls
  for delete using (auth.uid() = user_id);

create policy "activities select own" on public.activities
  for select using (auth.uid() = user_id);
create policy "activities insert own" on public.activities
  for insert with check (auth.uid() = user_id);
create policy "activities delete own" on public.activities
  for delete using (auth.uid() = user_id);

create policy "notes select own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes insert own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes update own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes delete own" on public.notes
  for delete using (auth.uid() = user_id);

create policy "follow_ups select own" on public.follow_ups
  for select using (auth.uid() = user_id);
create policy "follow_ups insert own" on public.follow_ups
  for insert with check (auth.uid() = user_id);
create policy "follow_ups update own" on public.follow_ups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "follow_ups delete own" on public.follow_ups
  for delete using (auth.uid() = user_id);

create policy "tasks select own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks insert own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks update own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks delete own" on public.tasks
  for delete using (auth.uid() = user_id);

create policy "notifications select own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications insert own" on public.notifications
  for insert with check (auth.uid() = user_id);
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications delete own" on public.notifications
  for delete using (auth.uid() = user_id);

-- -------------------------------------------------------------
-- Security helper: service role bypass (seed/imports)
-- -------------------------------------------------------------
create policy "leads service select" on public.leads for select using (true);
create policy "leads service delete" on public.leads for delete using (true);
create policy "calls service select" on public.calls for select using (true);
create policy "calls service delete" on public.calls for delete using (true);
create policy "activities service select" on public.activities for select using (true);
create policy "activities service delete" on public.activities for delete using (true);
create policy "notes service select" on public.notes for select using (true);
create policy "notes service delete" on public.notes for delete using (true);
create policy "follow_ups service select" on public.follow_ups for select using (true);
create policy "follow_ups service delete" on public.follow_ups for delete using (true);
create policy "tasks service select" on public.tasks for select using (true);
create policy "tasks service delete" on public.tasks for delete using (true);
create policy "notifications service select" on public.notifications for select using (true);
create policy "notifications service delete" on public.notifications for delete using (true);