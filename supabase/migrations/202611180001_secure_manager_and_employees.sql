-- Skywheels secure manager + staff migration. Existing vehicle rows are preserved.
create table if not exists public.manager_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.employees (
 id uuid primary key default gen_random_uuid(), name text not null, job_title text not null,
 phone text, photo_path text, display_order integer not null default 0,
 is_active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.manager_accounts enable row level security;
alter table public.employees enable row level security;
create or replace function public.is_skywheels_manager()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.manager_accounts where user_id=auth.uid()); $$;
revoke all on function public.is_skywheels_manager() from public;
grant execute on function public.is_skywheels_manager() to anon, authenticated;
drop policy if exists "Manager can view all vehicles" on public.vehicles;
drop policy if exists "Manager can update vehicles" on public.vehicles;
drop policy if exists "Manager can delete vehicles" on public.vehicles;
create policy "Authorised manager can view all vehicles" on public.vehicles for select to authenticated using(public.is_skywheels_manager());
create policy "Authorised manager can update vehicles" on public.vehicles for update to authenticated using(public.is_skywheels_manager()) with check(public.is_skywheels_manager());
create policy "Authorised manager can delete vehicles" on public.vehicles for delete to authenticated using(public.is_skywheels_manager());
create policy "Public can view active employees" on public.employees for select to anon,authenticated using(is_active=true or public.is_skywheels_manager());
create policy "Authorised manager can insert employees" on public.employees for insert to authenticated with check(public.is_skywheels_manager());
create policy "Authorised manager can update employees" on public.employees for update to authenticated using(public.is_skywheels_manager()) with check(public.is_skywheels_manager());
create policy "Authorised manager can delete employees" on public.employees for delete to authenticated using(public.is_skywheels_manager());
grant select on public.employees to anon,authenticated;
grant insert,update,delete on public.employees to authenticated;
drop policy if exists "Manager can delete vehicle photos" on storage.objects;
create policy "Authorised manager can delete vehicle photos" on storage.objects for delete to authenticated using(bucket_id='vehicle-photos' and public.is_skywheels_manager());
