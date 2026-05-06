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
  driving_hours_total integer not null default 0,
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
drop policy if exists "Public can write student progress" on public.student_progress;
drop policy if exists "Public can update student progress" on public.student_progress;
drop policy if exists "Public can read student documents" on public.student_documents;
drop policy if exists "Public can write student documents" on public.student_documents;
drop policy if exists "Public can update student documents" on public.student_documents;
drop policy if exists "Public can read student requests" on public.student_requests;
drop policy if exists "Public can create student requests" on public.student_requests;
drop policy if exists "Public can update student requests" on public.student_requests;
revoke select, insert, update, delete on public.student_progress from anon, authenticated;
revoke select, insert, update, delete on public.student_documents from anon, authenticated;
revoke select, insert, update, delete on public.student_requests from anon, authenticated;

create or replace function public.public_get_student_progress(
  p_student_id text,
  p_staff_password text
)
returns setof public.student_progress
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.student_progress where student_id = p_student_id;
end;
$$;

create or replace function public.public_upsert_student_progress(
  p_progress_id text,
  p_student_id text,
  p_school_id text,
  p_theory_topics_total integer,
  p_theory_topics_completed integer,
  p_driving_hours_total integer,
  p_driving_hours_completed integer,
  p_internal_exam_passed boolean,
  p_internal_exam_date date,
  p_internal_exam_status text,
  p_gaid_exam_date date,
  p_gibdd_exam_status text,
  p_notes text,
  p_updated_at timestamptz,
  p_staff_password text
)
returns table (progress_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  insert into public.student_progress (
    id, student_id, school_id, theory_topics_total, theory_topics_completed,
    driving_hours_total, driving_hours_completed, internal_exam_passed,
    internal_exam_date, internal_exam_status, gaid_exam_date, gibdd_exam_status,
    notes, updated_at
  ) values (
    p_progress_id, p_student_id, p_school_id, greatest(coalesce(p_theory_topics_total, 0), 0), greatest(coalesce(p_theory_topics_completed, 0), 0),
    greatest(coalesce(p_driving_hours_total, 0), 0), greatest(coalesce(p_driving_hours_completed, 0), 0), coalesce(p_internal_exam_passed, false),
    p_internal_exam_date, coalesce(p_internal_exam_status, 'not_scheduled'), p_gaid_exam_date, coalesce(p_gibdd_exam_status, 'not_scheduled'),
    coalesce(p_notes, ''), coalesce(p_updated_at, now())
  )
  on conflict (student_id)
  do update set
    school_id = excluded.school_id,
    theory_topics_total = excluded.theory_topics_total,
    theory_topics_completed = excluded.theory_topics_completed,
    driving_hours_total = excluded.driving_hours_total,
    driving_hours_completed = excluded.driving_hours_completed,
    internal_exam_passed = excluded.internal_exam_passed,
    internal_exam_date = excluded.internal_exam_date,
    internal_exam_status = excluded.internal_exam_status,
    gaid_exam_date = excluded.gaid_exam_date,
    gibdd_exam_status = excluded.gibdd_exam_status,
    notes = excluded.notes,
    updated_at = excluded.updated_at;
  progress_id := p_progress_id;
  return next;
end;
$$;

create or replace function public.public_get_student_documents(
  p_student_id text,
  p_staff_password text
)
returns setof public.student_documents
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.student_documents where student_id = p_student_id;
end;
$$;

create or replace function public.public_upsert_student_documents(
  p_documents jsonb,
  p_staff_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  insert into public.student_documents (student_id, type, status, updated_at)
  select
    document->>'student_id',
    document->>'type',
    document->>'status',
    coalesce((document->>'updated_at')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb)) as document
  on conflict (student_id, type)
  do update set status = excluded.status, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.public_create_student_request(
  p_request_id text,
  p_school_id text,
  p_student_id text,
  p_booking_id text,
  p_type text,
  p_reason text,
  p_preferred_time text,
  p_comment text,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
returns table (request_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type not in ('reschedule', 'cancel') then
    raise exception 'Student request type is invalid.';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Student request reason is required.';
  end if;

  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and school_id = p_school_id
  ) then
    raise exception 'Student not found.';
  end if;

  insert into public.student_requests (
    id, school_id, student_id, booking_id, type, status, reason,
    preferred_time, comment, created_at, updated_at
  ) values (
    p_request_id, p_school_id, p_student_id, p_booking_id, p_type, 'new', trim(p_reason),
    nullif(trim(coalesce(p_preferred_time, '')), ''), nullif(trim(coalesce(p_comment, '')), ''),
    coalesce(p_created_at, now()), coalesce(p_updated_at, now())
  );

  request_id := p_request_id;
  return next;
end;
$$;

create or replace function public.public_update_student_request_status(
  p_school_id text,
  p_request_id text,
  p_status text,
  p_updated_at timestamptz,
  p_staff_password text
)
returns table (request_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  update public.student_requests
    set status = p_status,
        updated_at = coalesce(p_updated_at, now())
    where school_id = p_school_id
      and id = p_request_id;
  if not found then
    raise exception 'Student request not found.';
  end if;
  request_id := p_request_id;
  return next;
end;
$$;

grant execute on function public.public_get_student_progress(text, text) to anon, authenticated;
grant execute on function public.public_upsert_student_progress(text, text, text, integer, integer, integer, integer, boolean, date, text, date, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.public_get_student_documents(text, text) to anon, authenticated;
grant execute on function public.public_upsert_student_documents(jsonb, text) to anon, authenticated;
grant execute on function public.public_create_student_request(text, text, text, text, text, text, text, text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.public_update_student_request_status(text, text, text, timestamptz, text) to anon, authenticated;
