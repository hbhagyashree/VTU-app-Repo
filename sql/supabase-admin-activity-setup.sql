-- VTU SmartPrep incremental admin activity setup
-- Run this in an existing Supabase project after the base schema already exists.

create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  action text not null,
  details text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_admin_activity_log_subject_id on admin_activity_log(subject_id);
create index if not exists idx_admin_activity_log_user_id on admin_activity_log(user_id);
create index if not exists idx_admin_activity_log_created_at on admin_activity_log(created_at);

alter table admin_activity_log enable row level security;

drop policy if exists "Admin activity is admin readable" on admin_activity_log;
create policy "Admin activity is admin readable"
on admin_activity_log
for select
using (public.is_admin());

drop policy if exists "Admin activity is admin writable" on admin_activity_log;
create policy "Admin activity is admin writable"
on admin_activity_log
for insert
with check (public.is_admin() and auth.uid() = user_id);
