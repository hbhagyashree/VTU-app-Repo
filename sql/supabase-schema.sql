-- VTU SmartPrep Supabase schema

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('student', 'admin')),
  avatar_url text,
  created_at timestamp with time zone default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default now()
);

create table if not exists semesters (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  number int not null,
  title text not null,
  created_at timestamp with time zone default now(),
  unique (department_id, number)
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  semester_id uuid not null references semesters(id) on delete cascade,
  name text not null,
  code text,
  description text,
  published boolean not null default false,
  created_at timestamp with time zone default now(),
  unique (department_id, semester_id, name)
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  description text,
  "order" int not null default 1,
  created_at timestamp with time zone default now(),
  unique (subject_id, "order")
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  type text not null check (type in ('notes', 'important-question', 'pyq', 'solved-answer', 'textbook', 'syllabus')),
  title text not null,
  content text,
  file_url text,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists pyqs (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  question text not null,
  answer text,
  year int,
  created_at timestamp with time zone default now()
);

create table if not exists generated_notes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  title text not null,
  content text not null,
  source text,
  status text not null default 'draft',
  created_at timestamp with time zone default now()
);

create table if not exists generated_answers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  question text not null,
  answer text not null,
  mark_type text not null check (mark_type in ('2-mark', '5-mark', '10-mark')),
  source text,
  status text not null default 'draft',
  created_at timestamp with time zone default now()
);

create table if not exists important_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  question text not null,
  year int,
  created_at timestamp with time zone default now()
);

create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  plan jsonb not null,
  created_at timestamp with time zone default now()
);

create table if not exists ask_ai_history (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  question text not null,
  response text not null,
  context jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  item_type text not null check (item_type in ('document', 'pyq', 'generated_note', 'generated_answer')),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  action text not null,
  details text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = coalesce(excluded.role, public.profiles.role),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

create index if not exists idx_semesters_department_id on semesters(department_id);
create index if not exists idx_subjects_department_id on subjects(department_id);
create index if not exists idx_subjects_semester_id on subjects(semester_id);
create index if not exists idx_subjects_published on subjects(published);
create index if not exists idx_modules_subject_id on modules(subject_id);
create index if not exists idx_documents_subject_id on documents(subject_id);
create index if not exists idx_documents_module_id on documents(module_id);
create index if not exists idx_documents_type on documents(type);
create index if not exists idx_pyqs_subject_id on pyqs(subject_id);
create index if not exists idx_pyqs_module_id on pyqs(module_id);
create index if not exists idx_generated_notes_subject_id on generated_notes(subject_id);
create index if not exists idx_generated_notes_module_id on generated_notes(module_id);
create index if not exists idx_generated_answers_subject_id on generated_answers(subject_id);
create index if not exists idx_important_questions_subject_id on important_questions(subject_id);
create index if not exists idx_important_questions_module_id on important_questions(module_id);
create index if not exists idx_study_plans_subject_id on study_plans(subject_id);
create index if not exists idx_ask_ai_history_subject_id on ask_ai_history(subject_id);
create index if not exists idx_ask_ai_history_user_id on ask_ai_history(user_id);
create index if not exists idx_bookmarks_user_id on bookmarks(user_id);
create index if not exists idx_bookmarks_subject_id on bookmarks(subject_id);
create index if not exists idx_bookmarks_document_id on bookmarks(document_id);
create index if not exists idx_admin_activity_log_subject_id on admin_activity_log(subject_id);
create index if not exists idx_admin_activity_log_user_id on admin_activity_log(user_id);
create index if not exists idx_admin_activity_log_created_at on admin_activity_log(created_at);

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
before update on documents
for each row
execute function set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table profiles enable row level security;
alter table departments enable row level security;
alter table semesters enable row level security;
alter table subjects enable row level security;
alter table modules enable row level security;
alter table documents enable row level security;
alter table pyqs enable row level security;
alter table generated_notes enable row level security;
alter table generated_answers enable row level security;
alter table important_questions enable row level security;
alter table study_plans enable row level security;
alter table ask_ai_history enable row level security;
alter table bookmarks enable row level security;
alter table admin_activity_log enable row level security;

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

drop policy if exists "Profiles readable by owner or admin" on profiles;
create policy "Profiles readable by owner or admin"
on profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles insertable by owner" on profiles;
create policy "Profiles insertable by owner"
on profiles
for insert
with check (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles updatable by owner or admin" on profiles;
create policy "Profiles updatable by owner or admin"
on profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "Departments are publicly readable" on departments;
create policy "Departments are publicly readable"
on departments
for select
using (true);

drop policy if exists "Departments are admin managed" on departments;
create policy "Departments are admin managed"
on departments
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Semesters are publicly readable" on semesters;
create policy "Semesters are publicly readable"
on semesters
for select
using (true);

drop policy if exists "Semesters are admin managed" on semesters;
create policy "Semesters are admin managed"
on semesters
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Published subjects are publicly readable" on subjects;
create policy "Published subjects are publicly readable"
on subjects
for select
using (published = true or public.is_admin());

drop policy if exists "Subjects are admin managed" on subjects;
create policy "Subjects are admin managed"
on subjects
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Modules on published subjects are publicly readable" on modules;
create policy "Modules on published subjects are publicly readable"
on modules
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = modules.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "Modules are admin managed" on modules;
create policy "Modules are admin managed"
on modules
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Documents on published subjects are publicly readable" on documents;
create policy "Documents on published subjects are publicly readable"
on documents
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = documents.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "Documents are admin managed" on documents;
create policy "Documents are admin managed"
on documents
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "PYQs on published subjects are publicly readable" on pyqs;
create policy "PYQs on published subjects are publicly readable"
on pyqs
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = pyqs.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "PYQs are admin managed" on pyqs;
create policy "PYQs are admin managed"
on pyqs
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Generated notes on published subjects are publicly readable" on generated_notes;
create policy "Generated notes on published subjects are publicly readable"
on generated_notes
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = generated_notes.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "Generated notes are admin managed" on generated_notes;
create policy "Generated notes are admin managed"
on generated_notes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Generated answers on published subjects are publicly readable" on generated_answers;
create policy "Generated answers on published subjects are publicly readable"
on generated_answers
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = generated_answers.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "Generated answers are admin managed" on generated_answers;
create policy "Generated answers are admin managed"
on generated_answers
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Important questions on published subjects are publicly readable" on important_questions;
create policy "Important questions on published subjects are publicly readable"
on important_questions
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = important_questions.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "Important questions are admin managed" on important_questions;
create policy "Important questions are admin managed"
on important_questions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Study plans on published subjects are publicly readable" on study_plans;
create policy "Study plans on published subjects are publicly readable"
on study_plans
for select
using (
  exists (
    select 1
    from subjects
    where subjects.id = study_plans.subject_id
      and (subjects.published = true or public.is_admin())
  )
);

drop policy if exists "Study plans are admin managed" on study_plans;
create policy "Study plans are admin managed"
on study_plans
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Ask AI history is private to its owner" on ask_ai_history;
create policy "Ask AI history is private to its owner"
on ask_ai_history
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Ask AI history is writable by its owner" on ask_ai_history;
create policy "Ask AI history is writable by its owner"
on ask_ai_history
for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Ask AI history is removable by its owner" on ask_ai_history;
create policy "Ask AI history is removable by its owner"
on ask_ai_history
for delete
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Bookmarks are private to their owner" on bookmarks;
create policy "Bookmarks are private to their owner"
on bookmarks
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Bookmarks are writable by their owner" on bookmarks;
create policy "Bookmarks are writable by their owner"
on bookmarks
for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Bookmarks are editable by their owner" on bookmarks;
create policy "Bookmarks are editable by their owner"
on bookmarks
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Bookmarks are removable by their owner" on bookmarks;
create policy "Bookmarks are removable by their owner"
on bookmarks
for delete
using (auth.uid() = user_id or public.is_admin());

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

-- After your first real signup, promote that user once to unlock the admin dashboard:
-- update public.profiles set role = 'admin' where email = 'your-admin-email@example.com';
-- If you applied this schema before storage upload support was added, rerun the bucket/policy block above.

-- Seed sample data
insert into departments (name, slug, description) values
  ('Computer Science and Engineering', 'cse', 'CSE department for VTU.')
  on conflict do nothing;

insert into semesters (department_id, number, title)
select id, 4, 'Semester 4' from departments where slug = 'cse'
  on conflict do nothing;

insert into subjects (department_id, semester_id, name, code, description, published)
select d.id, s.id, 'Analysis and Design of Algorithms', 'CS401', 'Design and analysis of algorithms subject.', true
from departments d
join semesters s on s.department_id = d.id and s.number = 4
where d.slug = 'cse'
on conflict do nothing;

insert into subjects (department_id, semester_id, name, code, description, published)
select d.id, s.id, 'Operating Systems', 'CS402', 'Operating systems concepts and design.', true
from departments d
join semesters s on s.department_id = d.id and s.number = 4
where d.slug = 'cse'
on conflict do nothing;

insert into subjects (department_id, semester_id, name, code, description, published)
select d.id, s.id, 'DBMS', 'CS403', 'Database management systems fundamentals.', true
from departments d
join semesters s on s.department_id = d.id and s.number = 4
where d.slug = 'cse'
on conflict do nothing;
