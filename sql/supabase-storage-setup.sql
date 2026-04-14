-- VTU SmartPrep incremental storage setup
-- Run this in an existing Supabase project after the base schema already exists.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

insert into storage.buckets (id, name, public)
values ('subject-resources', 'subject-resources', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "Subject resources are publicly readable" on storage.objects;
create policy "Subject resources are publicly readable"
on storage.objects
for select
using (bucket_id = 'subject-resources');

drop policy if exists "Subject resources are admin upload only" on storage.objects;
create policy "Subject resources are admin upload only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'subject-resources'
  and public.is_admin()
);

drop policy if exists "Subject resources are admin update only" on storage.objects;
create policy "Subject resources are admin update only"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'subject-resources'
  and public.is_admin()
)
with check (
  bucket_id = 'subject-resources'
  and public.is_admin()
);

drop policy if exists "Subject resources are admin delete only" on storage.objects;
create policy "Subject resources are admin delete only"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'subject-resources'
  and public.is_admin()
);
