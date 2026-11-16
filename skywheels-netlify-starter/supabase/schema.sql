-- Skywheels database setup
-- Run this in Supabase SQL Editor. Create one manager user manually in
-- Supabase Dashboard > Authentication > Users. Do not enable public sign-up.

create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  make_model text not null check (char_length(make_model) between 1 and 100),
  year integer,
  description text not null default '' check (char_length(description) <= 700),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

-- Public visitors can only see approved vehicles.
create policy "Anyone can view approved vehicles"
on public.vehicles for select
to anon, authenticated
using (status = 'approved');

-- Public visitors may submit a new pending vehicle only.
create policy "Visitors can submit pending vehicles"
on public.vehicles for insert
to anon, authenticated
with check (status = 'pending');

-- Only authenticated manager account(s) can moderate and delete.
create policy "Managers can update vehicles"
on public.vehicles for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Managers can delete vehicles"
on public.vehicles for delete
to authenticated
using (auth.uid() is not null);

-- The browser app uses a private bucket. Signed URLs are generated for gallery images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Uploads are placed in a folder named with the newly-created vehicle UUID.
-- This allows unauthenticated uploads only to that folder. The application
-- limits each submission to five files; also configure storage limits in Supabase.
create policy "Visitors can upload vehicle photos"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
);

-- Authenticated manager can read and delete stored photos.
create policy "Visitors can read photos for approved gallery vehicles"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'vehicle-photos'
  and exists (
    select 1 from public.vehicles v
    where v.status = 'approved'
      and name = any(v.image_paths)
  )
);

create policy "Managers can delete vehicle photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'vehicle-photos' and auth.uid() is not null);

-- Public visitors can only read storage objects whose path is listed on an
-- approved vehicle row. The app creates short-lived signed URLs for display.
-- Do not expose service-role keys in VITE_ variables.
