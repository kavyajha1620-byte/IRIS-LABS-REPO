-- =============================================================
-- IrisLabs CRM — Admin roles, profile emails, admin RLS
-- Run AFTER 0001_schema.sql and 0002_seed.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. profiles.email so the admin panel can list users with emails
--    (auth.users is not readable through the REST/PostgREST API)
-- -------------------------------------------------------------
alter table public.profiles add column if not exists email text;

-- -------------------------------------------------------------
-- 2. Role helper used by admin RLS policies.
--    Security definer: runs as table owner, so it can read its own
--    profile row and auth.uid() without causing policy recursion.
-- -------------------------------------------------------------
create or replace function public.is_admin_or_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

-- -------------------------------------------------------------
-- 3. Track email when a user signs up / updates their email
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, 'owner')
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

-- Backfill email for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

-- -------------------------------------------------------------
-- 4. Admin RLS policies (is_admin_or_owner() bypasses RLS via
--    security definer, so these run without recursion)
-- -------------------------------------------------------------
create policy "profiles admin select" on public.profiles
  for select using (public.is_admin_or_owner());

create policy "profiles admin update" on public.profiles
  for update using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

create policy "leads admin select" on public.leads
  for select using (public.is_admin_or_owner());

create policy "leads admin update" on public.leads
  for update using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

create policy "leads admin delete" on public.leads
  for delete using (public.is_admin_or_owner());

create policy "calls admin select" on public.calls
  for select using (public.is_admin_or_owner());

create policy "activities admin select" on public.activities
  for select using (public.is_admin_or_owner());

create policy "notes admin select" on public.notes
  for select using (public.is_admin_or_owner());

create policy "follow_ups admin select" on public.follow_ups
  for select using (public.is_admin_or_owner());

create policy "tasks admin select" on public.tasks
  for select using (public.is_admin_or_owner());

create policy "notifications admin select" on public.notifications
  for select using (public.is_admin_or_owner());

-- -------------------------------------------------------------
-- 5. Team summary for the admin panel (guarded: admins only)
-- -------------------------------------------------------------
create or replace function public.admin_team_summary()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  lead_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_or_owner() then
    return query
      select p.id, p.email, p.full_name, p.role,
             (select count(*)::bigint from public.leads l where l.user_id = p.id),
             p.created_at
      from public.profiles p
      order by p.created_at desc;
  end if;
  return;
end $$;