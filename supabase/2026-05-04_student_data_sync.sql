-- Student cabinet Supabase persistence for existing Drivedesk installs.
-- Apply this in Supabase SQL Editor after DRIVEDESK_FULL_SETUP.sql if your project already exists.

alter table public.students
  add column if not exists category_codes text[],
  add column if not exists training_stage text check (training_stage in ('theory', 'practice_ground', 'city', 'exam_prep', 'exam', 'completed')),
  add column if not exists group_name text,
  add column if not exists training_start_date date,
  add column if not exists driving_start_date date,
  add column if not exists training_end_date date,
  add column if not exists driving_end_date date;

create table if not exists public.student_progress (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  school_id text not null references public.schools(id) on delete cascade,
  theory_topics_total integer not null default 0,
  theory_topics_completed integer not null default 0,
  driving_hours_total integer not null default 56,
  driving_hours_completed integer not null default 0,
  internal_exam_passed boolean not null default false,
  internal_exam_date date,
  internal_exam_status text not null default 'not_scheduled' check (internal_exam_status in ('not_scheduled', 'scheduled', 'passed', 'failed')),
  gaid_exam_date date,
  gibdd_exam_status text not null default 'not_scheduled' check (gibdd_exam_status in ('not_scheduled', 'scheduled', 'passed', 'failed')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.student_documents (
  student_id text not null references public.students(id) on delete cascade,
  type text not null check (type in ('passport', 'medical_certificate', 'snils', 'contract', 'photo', 'state_fee')),
  status text not null default 'missing' check (status in ('missing', 'pending', 'provided', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  primary key (student_id, type)
);

create table if not exists public.student_requests (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  student_id text not null references public.students(id) on delete cascade,
  booking_id text references public.bookings(id) on delete set null,
  type text not null check (type in ('reschedule', 'cancel')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'rejected')),
  reason text not null,
  preferred_time text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_progress_school_id_idx on public.student_progress(school_id);
create index if not exists student_requests_school_id_idx on public.student_requests(school_id);
create index if not exists student_requests_student_id_idx on public.student_requests(student_id);

alter table public.student_progress enable row level security;
alter table public.student_documents enable row level security;
alter table public.student_requests enable row level security;

drop policy if exists "Public can read student progress" on public.student_progress;
create policy "Public can read student progress"
  on public.student_progress for select
  using (true);

drop policy if exists "Public can write student progress" on public.student_progress;
create policy "Public can write student progress"
  on public.student_progress for insert
  with check (true);

drop policy if exists "Public can update student progress" on public.student_progress;
create policy "Public can update student progress"
  on public.student_progress for update
  using (true)
  with check (true);

drop policy if exists "Public can read student documents" on public.student_documents;
create policy "Public can read student documents"
  on public.student_documents for select
  using (true);

drop policy if exists "Public can write student documents" on public.student_documents;
create policy "Public can write student documents"
  on public.student_documents for insert
  with check (true);

drop policy if exists "Public can update student documents" on public.student_documents;
create policy "Public can update student documents"
  on public.student_documents for update
  using (true)
  with check (true);

drop policy if exists "Public can read student requests" on public.student_requests;
create policy "Public can read student requests"
  on public.student_requests for select
  using (true);

drop policy if exists "Public can create student requests" on public.student_requests;
create policy "Public can create student requests"
  on public.student_requests for insert
  with check (true);

drop policy if exists "Public can update student requests" on public.student_requests;
create policy "Public can update student requests"
  on public.student_requests for update
  using (true)
  with check (true);

grant select, insert, update on public.student_progress to anon, authenticated;
grant select, insert, update on public.student_documents to anon, authenticated;
grant select, insert, update on public.student_requests to anon, authenticated;
