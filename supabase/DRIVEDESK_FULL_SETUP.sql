-- DriveDesk full Supabase setup.
-- Paste this whole file into Supabase SQL Editor and run it as one query.
-- It recreates the current development database structure and demo school data.

-- BEGIN DRIVEDESK_SAFE_PATCH
-- Safe production patch: no table drops, no demo-data reset.
-- This is what scripts/apply-supabase-sql.mjs applies by default.

create extension if not exists "pgcrypto";

create table if not exists public.staff_access_credentials (
  role text primary key,
  password_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schools
  add column if not exists enabled_category_codes text[] not null default array['B'];

alter table public.schools
  add column if not exists access_status text not null default 'trial',
  add column if not exists access_paid_until date,
  add column if not exists access_last_paid_at date,
  add column if not exists access_last_amount integer,
  add column if not exists access_payment_note text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'schools_access_status_check'
  ) then
    alter table public.schools
      add constraint schools_access_status_check
      check (access_status in ('trial', 'active', 'expires_soon', 'overdue', 'blocked'));
  end if;
end;
$$;


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

do $$
begin
  alter table public.students drop constraint if exists students_training_stage_check;
  alter table public.students
    add constraint students_training_stage_check
    check (training_stage is null or training_stage in ('new_request', 'awaiting_contract', 'contract_signed', 'theory', 'training_active', 'no_bookings', 'has_debt', 'missing_documents', 'practice_ground', 'city', 'theory_completed', 'practice_active', 'practice_completed', 'exam_prep', 'ready_for_internal_exam', 'internal_exam_passed', 'ready_for_gibdd', 'exam', 'training_completed', 'completed', 'archived', 'refused', 'frozen'));

  alter table public.bookings drop constraint if exists bookings_status_check;
  alter table public.bookings
    add constraint bookings_status_check
    check (status in ('active', 'cancelled', 'completed', 'no_show'));
end;
$$;


alter table public.slots
  add column if not exists lesson_type text not null default 'driving';

alter table public.students
  add column if not exists password_hash text,
  add column if not exists avatar_url text,
  add column if not exists assigned_branch_id text references public.branches(id) on delete set null,
  add column if not exists assigned_instructor_id text references public.instructors(id) on delete set null,
  add column if not exists category_codes text[],
  add column if not exists training_stage text,
  add column if not exists group_name text not null default '',
  add column if not exists training_start_date date,
  add column if not exists driving_start_date date,
  add column if not exists training_end_date date,
  add column if not exists driving_end_date date,
  add column if not exists branch_change_requested_at timestamptz,
  add column if not exists branch_change_note text,
  add column if not exists status text not null default 'active',
  add column if not exists categories text[] not null default array['B'],
  add column if not exists contract_number text not null default '',
  add column if not exists contract_date date,
  add column if not exists medical_certificate_expires_at date,
  add column if not exists theory_access_expires_at date,
  add column if not exists last_activity_at timestamptz,
  add column if not exists notes text not null default '';

create table if not exists public.lead_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  school_name text not null,
  city text not null default '',
  comment text not null default '',
  source text not null default 'landing',
  page_url text not null default '',
  user_agent text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  created_at timestamptz not null default now()
);

alter table public.lead_requests enable row level security;

drop policy if exists lead_requests_public_insert on public.lead_requests;
create policy lead_requests_public_insert
  on public.lead_requests
  for insert
  to anon, authenticated
  with check (
    length(trim(name)) between 2 and 700
    and length(trim(phone)) between 6 and 700
    and length(trim(school_name)) between 2 and 700
    and status = 'new'
  );

insert into public.staff_access_credentials (role, password_sha256) values
  ('admin', '94754e78d07756488a78665a5b7bb3a1d636dabb002e682e4f8fac946250603d'),
  ('superadmin', 'a9979a4f54ede620455a9ea469844e45ba9054da9ce92822b7ebb33436728c5d')
on conflict (role)
do update set
  password_sha256 = excluded.password_sha256,
  updated_at = now();

create or replace function public.private_assert_admin_password(p_staff_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
begin
  select password_sha256
    into v_expected
    from public.staff_access_credentials
    where role = 'admin';

  if v_expected is null
    or encode(extensions.digest(coalesce(p_staff_password, ''), 'sha256'), 'hex') <> v_expected then
    raise exception 'Admin access denied.';
  end if;
end;
$$;

drop function if exists public.public_cancel_booking(text, text);
drop function if exists public.public_complete_booking(text, text);
drop function if exists public.public_no_show_booking(text, text);
drop function if exists public.public_reschedule_booking(text, text, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer, text);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer, text, text);
drop function if exists public.public_update_slot_status(text, text, text);
drop function if exists public.public_delete_slot(text, text);
drop function if exists public.public_upsert_branch(text, text, text, text, text, boolean, text);
drop function if exists public.public_delete_branch(text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text);
drop function if exists public.public_update_instructor_active(text, boolean, text);
drop function if exists public.public_admin_update_student(text, text, text, text, text, text, text, text, text, text[], text, text, date, date, date, date, timestamptz, text, text);
drop function if exists public.public_get_student_progress(text, text);
drop function if exists public.public_upsert_student_progress(text, text, text, integer, integer, integer, integer, boolean, date, text, date, text, text, timestamptz, text);
drop function if exists public.public_get_student_documents(text, text);
drop function if exists public.public_upsert_student_documents(jsonb, text);
drop function if exists public.public_admin_list_student_requests(text, text);
drop function if exists public.public_create_student_request(text, text, text, text, text, text, text, text, timestamptz, timestamptz);
drop function if exists public.public_update_student_request_status(text, text, text, timestamptz, text);

drop function if exists public.public_update_student_profile(text, text, text, text, text, text, text[], text, text, date, date, date, date);
drop function if exists public.public_login_student(text, text, text);

create or replace function public.public_update_student_profile(
  p_school_id text,
  p_phone text,
  p_name text,
  p_email text,
  p_password text,
  p_avatar_url text,
  p_category_codes text[] default null,
  p_training_stage text default null,
  p_group_name text default null,
  p_training_start_date date default null,
  p_driving_start_date date default null,
  p_training_end_date date default null,
  p_driving_end_date date default null
)
returns table (
  student_id text,
  student_phone text,
  profile_ready boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
  v_student_id text;
begin
  v_normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_normalized_phone) = 11 and left(v_normalized_phone, 1) = '8' then
    v_normalized_phone := '7' || substring(v_normalized_phone from 2);
  elsif length(v_normalized_phone) = 10 and left(v_normalized_phone, 1) = '9' then
    v_normalized_phone := '7' || v_normalized_phone;
  end if;

  if v_normalized_phone !~ '^7[0-9]{10}$' then
    raise exception 'Phone is invalid.';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Student name is required.';
  end if;

  if p_training_stage is not null and p_training_stage not in ('new_request', 'awaiting_contract', 'contract_signed', 'theory', 'training_active', 'no_bookings', 'has_debt', 'missing_documents', 'practice_ground', 'city', 'theory_completed', 'practice_active', 'practice_completed', 'exam_prep', 'ready_for_internal_exam', 'internal_exam_passed', 'ready_for_gibdd', 'exam', 'training_completed', 'completed', 'archived', 'refused', 'frozen') then
    raise exception 'Student training stage is invalid.';
  end if;

  if not exists (
    select 1 from public.students
    where school_id = p_school_id
      and normalized_phone = v_normalized_phone
      and password_hash is not null
  ) and (p_password is null or length(p_password) < 6) then
    raise exception 'Password is too short.';
  end if;

  insert into public.students (
    id, school_id, name, phone, normalized_phone, email, password_hash, avatar_url,
    category_codes, training_stage, group_name, training_start_date, driving_start_date,
    training_end_date, driving_end_date
  ) values (
    'stu-' || replace(gen_random_uuid()::text, '-', ''),
    p_school_id,
    trim(p_name),
    v_normalized_phone,
    v_normalized_phone,
    coalesce(trim(p_email), ''),
    case when p_password is not null and length(p_password) >= 6 then extensions.crypt(p_password, extensions.gen_salt('bf')) else null end,
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    nullif(p_category_codes, '{}'), p_training_stage, p_group_name, p_training_start_date, p_driving_start_date,
    p_training_end_date, p_driving_end_date
  )
  on conflict (school_id, normalized_phone)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    password_hash = coalesce(excluded.password_hash, public.students.password_hash),
    avatar_url = excluded.avatar_url,
    category_codes = coalesce(nullif(p_category_codes, '{}'), public.students.category_codes),
    training_stage = coalesce(p_training_stage, public.students.training_stage),
    group_name = coalesce(p_group_name, public.students.group_name),
    training_start_date = coalesce(p_training_start_date, public.students.training_start_date),
    driving_start_date = coalesce(p_driving_start_date, public.students.driving_start_date),
    training_end_date = coalesce(p_training_end_date, public.students.training_end_date),
    driving_end_date = coalesce(p_driving_end_date, public.students.driving_end_date),
    updated_at = now()
  returning public.students.id into v_student_id;

  student_id := v_student_id;
  student_phone := v_normalized_phone;
  profile_ready := true;
  return next;
end;
$$;

create or replace function public.public_login_student(
  p_school_id text,
  p_phone text,
  p_password text
)
returns table (
  student_id text,
  name text,
  phone text,
  email text,
  avatar_url text,
  assigned_branch_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
begin
  v_normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_normalized_phone) = 11 and left(v_normalized_phone, 1) = '8' then
    v_normalized_phone := '7' || substring(v_normalized_phone from 2);
  elsif length(v_normalized_phone) = 10 and left(v_normalized_phone, 1) = '9' then
    v_normalized_phone := '7' || v_normalized_phone;
  end if;

  return query
  select s.id, s.name, s.phone, s.email, s.avatar_url, s.assigned_branch_id
  from public.students s
  where s.school_id = p_school_id
    and s.normalized_phone = v_normalized_phone
    and s.password_hash is not null
    and s.password_hash = extensions.crypt(p_password, s.password_hash)
  limit 1;
end;
$$;

create or replace function public.public_cancel_booking(
  p_booking_id text,
  p_staff_password text
)
returns table (
  booking_id text,
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be cancelled.';
  end if;

  update public.bookings
    set status = 'cancelled',
        updated_at = now()
    where id = p_booking_id;

  update public.slots
    set status = 'available',
        booking_id = null,
        updated_at = now()
    where id = v_booking.slot_id;

  booking_id := p_booking_id;
  slot_id := v_booking.slot_id;
  return next;
end;
$$;

create or replace function public.public_complete_booking(
  p_booking_id text,
  p_staff_password text
)
returns table (
  booking_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be completed.';
  end if;

  update public.bookings
    set status = 'completed',
        updated_at = now()
    where id = p_booking_id;

  booking_id := p_booking_id;
  return next;
end;
$$;

create or replace function public.public_no_show_booking(
  p_booking_id text,
  p_staff_password text
)
returns table (
  booking_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be marked as no-show.';
  end if;

  update public.bookings
    set status = 'no_show',
        updated_at = now()
    where id = p_booking_id;

  booking_id := p_booking_id;
  return next;
end;
$$;

create or replace function public.public_reschedule_booking(
  p_booking_id text,
  p_new_slot_id text,
  p_staff_password text
)
returns table (
  booking_id text,
  previous_slot_id text,
  new_slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_next_slot public.slots%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be rescheduled.';
  end if;

  select *
    into v_next_slot
    from public.slots
    where id = p_new_slot_id
    for update;

  if not found then
    raise exception 'New slot not found.';
  end if;

  if v_next_slot.status <> 'available' then
    raise exception 'New slot is already booked.';
  end if;

  if v_next_slot.date < current_date then
    raise exception 'New slot is in the past.';
  end if;

  if not exists (
    select 1
    from public.schools s
    join public.branches b on b.id = v_next_slot.branch_id
    join public.instructors i on i.id = v_next_slot.instructor_id
    where s.id = v_booking.school_id
      and v_next_slot.school_id = v_booking.school_id
      and b.school_id = v_booking.school_id
      and i.school_id = v_booking.school_id
      and i.branch_id = v_next_slot.branch_id
      and s.is_active = true
      and b.is_active = true
      and i.is_active = true
  ) then
    raise exception 'New slot is no longer available.';
  end if;

  update public.slots
    set status = 'available',
        booking_id = null,
        updated_at = now()
    where id = v_booking.slot_id
      and booking_id = p_booking_id;

  update public.bookings
    set slot_id = v_next_slot.id,
        branch_id = v_next_slot.branch_id,
        instructor_id = v_next_slot.instructor_id,
        rescheduled_at = now(),
        updated_at = now()
    where id = p_booking_id;

  update public.slots
    set status = 'booked',
        booking_id = p_booking_id,
        updated_at = now()
    where id = v_next_slot.id;

  booking_id := p_booking_id;
  previous_slot_id := v_booking.slot_id;
  new_slot_id := v_next_slot.id;
  return next;
end;
$$;

create or replace function public.public_update_school_settings(
  p_school_id text,
  p_name text,
  p_slug text,
  p_description text,
  p_primary_color text,
  p_logo_url text,
  p_booking_limit_enabled boolean,
  p_max_active_bookings_per_student integer,
  p_branch_selection_mode text,
  p_max_slots_per_booking integer,
  p_default_lesson_duration integer,
  p_enabled_category_codes text[],
  p_staff_password text
)
returns table (
  school_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'School name is required.';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9-]+$' then
    raise exception 'School slug is invalid.';
  end if;

  if p_primary_color is not null and p_primary_color <> '' and p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Primary color is invalid.';
  end if;

  if p_max_active_bookings_per_student < 1 or p_max_active_bookings_per_student > 10 then
    raise exception 'Active bookings limit is invalid.';
  end if;

  if p_branch_selection_mode not in ('student_choice', 'fixed_first') then
    raise exception 'Branch selection mode is invalid.';
  end if;

  if p_max_slots_per_booking < 1 or p_max_slots_per_booking > 6 then
    raise exception 'Max slots per booking is invalid.';
  end if;

  if p_default_lesson_duration < 30 or p_default_lesson_duration > 240 then
    raise exception 'Lesson duration is invalid.';
  end if;

  update public.schools
    set name = trim(p_name),
        slug = trim(p_slug),
        description = coalesce(p_description, ''),
        primary_color = nullif(p_primary_color, ''),
        logo_url = nullif(p_logo_url, ''),
        booking_limit_enabled = coalesce(p_booking_limit_enabled, true),
        max_active_bookings_per_student = p_max_active_bookings_per_student,
        branch_selection_mode = p_branch_selection_mode,
        max_slots_per_booking = p_max_slots_per_booking,
        default_lesson_duration = p_default_lesson_duration,
        enabled_category_codes = coalesce(nullif(p_enabled_category_codes, '{}'), array['B']),
        updated_at = now()
    where id = p_school_id;

  if not found then
    raise exception 'School not found.';
  end if;

  school_id := p_school_id;
  return next;
end;
$$;

create or replace function public.public_create_slot(
  p_slot_id text,
  p_school_id text,
  p_branch_id text,
  p_instructor_id text,
  p_date text,
  p_start_time text,
  p_duration integer,
  p_lesson_type text,
  p_staff_password text
)
returns table (
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_date date;
  v_slot_time time;
begin
  perform public.private_assert_admin_password(p_staff_password);

  v_slot_date := p_date::date;
  v_slot_time := p_start_time::time;

  if v_slot_date < current_date then
    raise exception 'Slot date is in the past.';
  end if;

  if p_duration < 30 or p_duration > 240 or p_duration % 15 <> 0 then
    raise exception 'Slot duration is invalid.';
  end if;

  if p_lesson_type not in ('driving', 'main', 'extra', 'practice_ground', 'city', 'exam_route', 'internal_exam', 'retake', 'mistakes') then
    raise exception 'Slot lesson type is invalid.';
  end if;

  if not exists (
    select 1
    from public.branches
    where id = p_branch_id
      and school_id = p_school_id
      and is_active = true
  ) then
    raise exception 'Branch is not available.';
  end if;

  if not exists (
    select 1
    from public.instructors
    where id = p_instructor_id
      and school_id = p_school_id
      and branch_id = p_branch_id
      and is_active = true
  ) then
    raise exception 'Instructor is not available for this branch.';
  end if;

  if exists (
    select 1
    from public.slots
    where school_id = p_school_id
      and instructor_id = p_instructor_id
      and date = v_slot_date
      and status <> 'cancelled'
      and v_slot_time < (time + (duration || ' minutes')::interval)
      and time < (v_slot_time + (p_duration || ' minutes')::interval)
  ) then
    raise exception 'Slot overlaps existing instructor time.';
  end if;

  insert into public.slots (
    id, school_id, branch_id, instructor_id, date, time, duration, lesson_type, status
  ) values (
    p_slot_id, p_school_id, p_branch_id, p_instructor_id, v_slot_date, v_slot_time, p_duration, p_lesson_type, 'available'
  );

  slot_id := p_slot_id;
  return next;
exception
  when unique_violation then
    raise exception 'Slot already exists.';
end;
$$;

create or replace function public.public_update_slot_status(
  p_slot_id text,
  p_status text,
  p_staff_password text
)
returns table (
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_status not in ('available', 'booked', 'cancelled') then
    raise exception 'Slot status is invalid.';
  end if;

  select *
    into v_slot
    from public.slots
    where id = p_slot_id
    for update;

  if not found then
    raise exception 'Slot not found.';
  end if;

  if p_status = 'available' and v_slot.booking_id is not null then
    raise exception 'Booked slot cannot be manually released.';
  end if;

  if p_status = 'cancelled' and v_slot.booking_id is not null then
    raise exception 'Booked slot cannot be cancelled without booking handling.';
  end if;

  update public.slots
    set status = p_status,
        booking_id = case when p_status = 'available' then null else booking_id end,
        updated_at = now()
    where id = p_slot_id;

  slot_id := p_slot_id;
  return next;
end;
$$;

create or replace function public.public_delete_slot(
  p_slot_id text,
  p_staff_password text
)
returns table (
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_slot
    from public.slots
    where id = p_slot_id
    for update;

  if not found then
    raise exception 'Slot not found.';
  end if;

  if v_slot.booking_id is not null or v_slot.status = 'booked' then
    raise exception 'Booked slot cannot be deleted.';
  end if;

  delete from public.slots where id = p_slot_id;

  slot_id := p_slot_id;
  return next;
end;
$$;

create or replace function public.public_upsert_branch(
  p_branch_id text,
  p_school_id text,
  p_name text,
  p_address text,
  p_phone text,
  p_is_active boolean,
  p_staff_password text
)
returns table (
  branch_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Branch name is required.';
  end if;

  if not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;

  insert into public.branches (
    id, school_id, name, address, phone, is_active
  ) values (
    p_branch_id, p_school_id, trim(p_name), coalesce(p_address, ''), coalesce(p_phone, ''), coalesce(p_is_active, true)
  )
  on conflict (id)
  do update set
    name = excluded.name,
    address = excluded.address,
    phone = excluded.phone,
    is_active = excluded.is_active,
    updated_at = now();

  branch_id := p_branch_id;
  return next;
end;
$$;

create or replace function public.public_delete_branch(
  p_branch_id text,
  p_staff_password text
)
returns table (
  branch_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if exists (select 1 from public.instructors where branch_id = p_branch_id)
    or exists (select 1 from public.slots where branch_id = p_branch_id)
    or exists (select 1 from public.bookings where branch_id = p_branch_id) then
    raise exception 'Branch has related instructors, slots or bookings.';
  end if;

  delete from public.branches where id = p_branch_id;

  if not found then
    raise exception 'Branch not found.';
  end if;

  branch_id := p_branch_id;
  return next;
end;
$$;

create or replace function public.public_upsert_instructor(
  p_instructor_id text,
  p_school_id text,
  p_branch_id text,
  p_name text,
  p_phone text,
  p_email text,
  p_token text,
  p_bio text,
  p_is_active boolean,
  p_car text,
  p_transmission text,
  p_categories text[],
  p_staff_password text
)
returns table (
  instructor_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Instructor name is required.';
  end if;

  if p_transmission is not null and p_transmission <> '' and p_transmission not in ('manual', 'auto') then
    raise exception 'Transmission is invalid.';
  end if;

  if not exists (
    select 1 from public.branches
    where id = p_branch_id
      and school_id = p_school_id
  ) then
    raise exception 'Branch not found.';
  end if;

  insert into public.instructors (
    id, school_id, branch_id, name, phone, email, token, bio, experience,
    is_active, categories, avatar_initials, avatar_color, car, transmission
  ) values (
    p_instructor_id,
    p_school_id,
    p_branch_id,
    trim(p_name),
    coalesce(p_phone, ''),
    coalesce(p_email, ''),
    p_token,
    coalesce(p_bio, ''),
    0,
    coalesce(p_is_active, true),
    coalesce(nullif(p_categories, '{}'), array['B']),
    upper(left(trim(p_name), 1)),
    '#2a5d86',
    nullif(p_car, ''),
    nullif(p_transmission, '')
  )
  on conflict (id)
  do update set
    branch_id = excluded.branch_id,
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    bio = excluded.bio,
    is_active = excluded.is_active,
    categories = excluded.categories,
    car = excluded.car,
    transmission = excluded.transmission,
    updated_at = now();

  instructor_id := p_instructor_id;
  return next;
end;
$$;

create or replace function public.public_update_instructor_active(
  p_instructor_id text,
  p_is_active boolean,
  p_staff_password text
)
returns table (
  instructor_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  update public.instructors
    set is_active = coalesce(p_is_active, is_active),
        updated_at = now()
    where id = p_instructor_id;

  if not found then
    raise exception 'Instructor not found.';
  end if;

  instructor_id := p_instructor_id;
  return next;
end;
$$;

create or replace function public.public_admin_update_student(
  p_student_id text,
  p_school_id text,
  p_name text,
  p_phone text,
  p_normalized_phone text,
  p_email text,
  p_avatar_url text,
  p_assigned_branch_id text,
  p_assigned_instructor_id text,
  p_category_codes text[],
  p_training_stage text,
  p_group_name text,
  p_training_start_date date,
  p_driving_start_date date,
  p_training_end_date date,
  p_driving_end_date date,
  p_branch_change_requested_at timestamptz,
  p_branch_change_note text,
  p_staff_password text
)
returns table (student_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id text;
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Student name is required.';
  end if;

  if coalesce(p_normalized_phone, '') !~ '^7[0-9]{10}$' then
    raise exception 'Student phone is invalid.';
  end if;

  if p_training_stage is not null and p_training_stage not in ('new_request', 'awaiting_contract', 'contract_signed', 'theory', 'training_active', 'no_bookings', 'has_debt', 'missing_documents', 'practice_ground', 'city', 'theory_completed', 'practice_active', 'practice_completed', 'exam_prep', 'ready_for_internal_exam', 'internal_exam_passed', 'ready_for_gibdd', 'exam', 'training_completed', 'completed', 'archived', 'refused', 'frozen') then
    raise exception 'Student training stage is invalid.';
  end if;

  if p_assigned_instructor_id is not null and not exists (
    select 1
    from public.instructors
    where id = p_assigned_instructor_id
      and school_id = p_school_id
      and (p_assigned_branch_id is null or branch_id = p_assigned_branch_id)
  ) then
    raise exception 'Assigned instructor is invalid.';
  end if;

  if p_assigned_branch_id is not null and not exists (
    select 1 from public.branches where id = p_assigned_branch_id and school_id = p_school_id
  ) then
    raise exception 'Assigned branch is invalid.';
  end if;

  select id
    into v_existing_id
    from public.students
    where school_id = p_school_id
      and normalized_phone = p_normalized_phone
    limit 1
    for update;

  if v_existing_id is not null and v_existing_id <> p_student_id then
    update public.students
      set name = trim(p_name),
          phone = coalesce(p_phone, ''),
          normalized_phone = coalesce(p_normalized_phone, ''),
          email = coalesce(p_email, ''),
          avatar_url = p_avatar_url,
          assigned_branch_id = p_assigned_branch_id,
          assigned_instructor_id = p_assigned_instructor_id,
          category_codes = coalesce(nullif(p_category_codes, '{}'), array['B']),
          training_stage = p_training_stage,
          group_name = coalesce(p_group_name, ''),
          training_start_date = p_training_start_date,
          driving_start_date = p_driving_start_date,
          training_end_date = p_training_end_date,
          driving_end_date = p_driving_end_date,
          branch_change_requested_at = p_branch_change_requested_at,
          branch_change_note = p_branch_change_note,
          updated_at = now()
      where id = v_existing_id
        and school_id = p_school_id;

    student_id := v_existing_id;
    return next;
    return;
  end if;

  insert into public.students (
    id, school_id, name, phone, normalized_phone, email, avatar_url,
    assigned_branch_id, assigned_instructor_id, category_codes, training_stage, group_name,
    training_start_date, driving_start_date, training_end_date, driving_end_date,
    branch_change_requested_at, branch_change_note
  ) values (
    p_student_id, p_school_id, trim(p_name), coalesce(p_phone, ''), coalesce(p_normalized_phone, ''), coalesce(p_email, ''), p_avatar_url,
    p_assigned_branch_id, p_assigned_instructor_id, coalesce(nullif(p_category_codes, '{}'), array['B']), p_training_stage, coalesce(p_group_name, ''),
    p_training_start_date, p_driving_start_date, p_training_end_date, p_driving_end_date,
    p_branch_change_requested_at, p_branch_change_note
  )
  on conflict (id)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    normalized_phone = excluded.normalized_phone,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    assigned_branch_id = excluded.assigned_branch_id,
    assigned_instructor_id = excluded.assigned_instructor_id,
    category_codes = excluded.category_codes,
    training_stage = excluded.training_stage,
    group_name = excluded.group_name,
    training_start_date = excluded.training_start_date,
    driving_start_date = excluded.driving_start_date,
    training_end_date = excluded.training_end_date,
    driving_end_date = excluded.driving_end_date,
    branch_change_requested_at = excluded.branch_change_requested_at,
    branch_change_note = excluded.branch_change_note,
    updated_at = now()
  returning id into student_id;

  return next;
end;
$$;

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

  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and school_id = p_school_id
  ) then
    raise exception 'Student not found.';
  end if;

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
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb)) as document
    where document->>'type' not in ('passport', 'medical_certificate', 'snils', 'contract', 'photo', 'state_fee')
       or document->>'status' not in ('missing', 'pending', 'provided', 'approved', 'rejected')
       or not exists (select 1 from public.students where id = document->>'student_id')
  ) then
    raise exception 'Student document payload is invalid.';
  end if;
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

create or replace function public.public_admin_list_student_requests(
  p_school_id text,
  p_staff_password text
)
returns setof public.student_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.student_requests where school_id = p_school_id order by created_at desc;
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

  if p_booking_id is not null and not exists (
    select 1
    from public.bookings
    where id = p_booking_id
      and student_id = p_student_id
      and school_id = p_school_id
  ) then
    raise exception 'Booking not found.';
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

  if p_status not in ('new', 'reviewing', 'resolved', 'rejected') then
    raise exception 'Student request status is invalid.';
  end if;

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

alter table public.staff_access_credentials enable row level security;

grant usage on schema public to anon, authenticated;
grant execute on function public.public_cancel_booking(text, text) to anon, authenticated;
grant execute on function public.public_complete_booking(text, text) to anon, authenticated;
grant execute on function public.public_no_show_booking(text, text) to anon, authenticated;
grant execute on function public.public_reschedule_booking(text, text, text) to anon, authenticated;
grant execute on function public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text) to anon, authenticated;
grant execute on function public.public_create_slot(text, text, text, text, text, text, integer, text, text) to anon, authenticated;
grant execute on function public.public_update_slot_status(text, text, text) to anon, authenticated;
grant execute on function public.public_delete_slot(text, text) to anon, authenticated;
grant execute on function public.public_upsert_branch(text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.public_delete_branch(text, text) to anon, authenticated;
grant execute on function public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text) to anon, authenticated;
grant execute on function public.public_update_instructor_active(text, boolean, text) to anon, authenticated;
grant execute on function public.public_admin_update_student(text, text, text, text, text, text, text, text, text, text[], text, text, date, date, date, date, timestamptz, text, text) to anon, authenticated;
grant execute on function public.public_get_student_progress(text, text) to anon, authenticated;
grant execute on function public.public_upsert_student_progress(text, text, text, integer, integer, integer, integer, boolean, date, text, date, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.public_get_student_documents(text, text) to anon, authenticated;
grant execute on function public.public_upsert_student_documents(jsonb, text) to anon, authenticated;
grant execute on function public.public_admin_list_student_requests(text, text) to anon, authenticated;
grant execute on function public.public_create_student_request(text, text, text, text, text, text, text, text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.public_update_student_request_status(text, text, text, timestamptz, text) to anon, authenticated;

create or replace function public.public_get_booking_group(p_booking_id text)
returns table (
  id text, booking_group_id text, school_id text, slot_id text, instructor_id text, branch_id text, student_id text,
  student_name text, student_phone text, student_email text, status text, notes text, comment text, rescheduled_at timestamptz, created_at timestamptz, updated_at timestamptz,
  school_name text, school_slug text, school_description text, school_phone text, school_email text, school_address text, school_logo_url text, school_primary_color text,
  school_booking_limit_enabled boolean, school_max_active_bookings_per_student integer, school_branch_selection_mode text, school_max_slots_per_booking integer, school_default_lesson_duration integer, school_enabled_category_codes text[], school_is_active boolean, school_created_at timestamptz, school_updated_at timestamptz,
  branch_school_id text, branch_name text, branch_address text, branch_phone text, branch_is_active boolean,
  instructor_school_id text, instructor_branch_id text, instructor_name text, instructor_phone text, instructor_email text, instructor_bio text, instructor_experience integer, instructor_is_active boolean, instructor_categories text[], instructor_avatar_initials text, instructor_avatar_color text, instructor_car text, instructor_transmission text,
  slot_school_id text, slot_instructor_id text, slot_branch_id text, slot_date date, slot_time time, slot_duration integer, slot_lesson_type text, slot_status text, slot_booking_id text, slot_created_at timestamptz,
  student_school_id text
)
language sql
security definer
set search_path = public
as $$
  with first_booking as (
    select b.booking_group_id from public.bookings b where b.id = p_booking_id
  )
  select b.id, b.booking_group_id, b.school_id, b.slot_id, b.instructor_id, b.branch_id, b.student_id,
    case when length(trim(coalesce(b.student_name, ''))) > 0 then left(trim(b.student_name), 1) || '.' else 'Ученик' end, case when length(regexp_replace(coalesce(b.student_phone, ''), '\D', '', 'g')) >= 4 then '••••' || right(regexp_replace(b.student_phone, '\D', '', 'g'), 4) else '' end, '', b.status, b.notes, b.comment, b.rescheduled_at, b.created_at, b.updated_at,
    s.name, s.slug, s.description, s.phone, s.email, s.address, s.logo_url, s.primary_color,
    s.booking_limit_enabled, s.max_active_bookings_per_student, s.branch_selection_mode, s.max_slots_per_booking, s.default_lesson_duration, s.enabled_category_codes, s.is_active, s.created_at, s.updated_at,
    br.school_id, br.name, br.address, br.phone, br.is_active,
    i.school_id, i.branch_id, i.name, i.phone, i.email, i.bio, i.experience, i.is_active, i.categories, i.avatar_initials, i.avatar_color, i.car, i.transmission,
    sl.school_id, sl.instructor_id, sl.branch_id, sl.date, sl.time, sl.duration, sl.lesson_type, sl.status, sl.booking_id, sl.created_at,
    st.school_id
  from public.bookings b
  join first_booking fb on (b.id = p_booking_id or (fb.booking_group_id is not null and b.booking_group_id = fb.booking_group_id))
  join public.schools s on s.id = b.school_id
  join public.branches br on br.id = b.branch_id
  join public.instructors i on i.id = b.instructor_id
  join public.slots sl on sl.id = b.slot_id
  join public.students st on st.id = b.student_id
  order by sl.date, sl.time;
$$;

create or replace function public.public_get_instructor_schedule(p_token text)
returns table (
  instructor_id text, instructor_school_id text, instructor_branch_id text, instructor_name text, instructor_phone text, instructor_bio text, instructor_experience integer, instructor_is_active boolean, instructor_categories text[], instructor_avatar_initials text, instructor_avatar_color text, instructor_car text, instructor_transmission text,
  branch_id text, branch_school_id text, branch_name text, branch_address text, branch_phone text, branch_is_active boolean,
  slot_id text, slot_school_id text, slot_instructor_id text, slot_branch_id text, slot_date date, slot_time time, slot_duration integer, slot_lesson_type text, slot_status text, slot_booking_id text, slot_created_at timestamptz,
  booking_id text, booking_group_id text, booking_school_id text, booking_slot_id text, booking_instructor_id text, booking_branch_id text, booking_student_id text, booking_student_label text, booking_status text, booking_created_at timestamptz, booking_updated_at timestamptz, booking_rescheduled_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.id, i.school_id, i.branch_id, i.name, i.phone, i.bio, i.experience, i.is_active, i.categories, i.avatar_initials, i.avatar_color, i.car, i.transmission,
    br.id, br.school_id, br.name, br.address, br.phone, br.is_active,
    sl.id, sl.school_id, sl.instructor_id, sl.branch_id, sl.date, sl.time, sl.duration, sl.lesson_type, sl.status, sl.booking_id, sl.created_at,
    b.id, b.booking_group_id, b.school_id, b.slot_id, b.instructor_id, b.branch_id, b.student_id, case when length(trim(coalesce(b.student_name, ''))) > 0 then left(trim(b.student_name), 1) || '.' else 'Ученик' end, b.status, b.created_at, b.updated_at, b.rescheduled_at
  from public.instructors i
  left join public.branches br on br.id = i.branch_id
  left join public.slots sl on sl.instructor_id = i.id
  left join public.bookings b on b.slot_id = sl.id and b.instructor_id = i.id
  where i.token = p_token
  order by sl.date, sl.time, b.created_at desc;
$$;

create or replace function public.public_admin_list_bookings(p_school_id text, p_staff_password text)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.bookings where school_id = p_school_id order by created_at desc;
end;
$$;

create or replace function public.public_admin_list_students(
  p_school_id text,
  p_staff_password text
)
returns setof public.students
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.students where school_id = p_school_id order by created_at desc;
end;
$$;

grant execute on function public.public_get_booking_group(text) to anon, authenticated;
grant execute on function public.public_get_instructor_schedule(text) to anon, authenticated;
grant execute on function public.public_admin_list_bookings(text, text) to anon, authenticated;
grant execute on function public.public_update_student_profile(text, text, text, text, text, text, text[], text, text, date, date, date, date) to anon, authenticated;
grant execute on function public.public_login_student(text, text, text) to anon, authenticated;
grant insert on public.lead_requests to anon, authenticated;
grant execute on function public.public_admin_list_students(text, text) to anon, authenticated;



alter table public.schools
  add column if not exists city text,
  add column if not exists director_name text,
  add column if not exists director_phone text,
  add column if not exists sales_status text not null default 'lead',
  add column if not exists sales_next_contact date,
  add column if not exists sales_note text not null default '',
  add column if not exists sales_promised text not null default '',
  add column if not exists sales_needed_from_client text not null default '',
  add column if not exists sales_owner text not null default '',
  add column if not exists access_payment_history jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.schools drop constraint if exists schools_sales_status_check;
  alter table public.schools
    add constraint schools_sales_status_check
    check (sales_status in ('lead', 'thinking', 'paid', 'onboarding', 'active', 'risk', 'rejected'));
end;
$$;

create or replace function public.public_superadmin_update_school_sales(
  p_school_id text,
  p_city text,
  p_director_name text,
  p_director_phone text,
  p_sales_status text,
  p_sales_next_contact date,
  p_sales_note text,
  p_sales_promised text,
  p_sales_needed_from_client text,
  p_sales_owner text,
  p_superadmin_password text
)
returns setof public.schools
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  if p_sales_status not in ('lead', 'thinking', 'paid', 'onboarding', 'active', 'risk', 'rejected') then
    raise exception 'Sales status is invalid.';
  end if;

  update public.schools
    set city = nullif(trim(coalesce(p_city, '')), ''),
        director_name = nullif(trim(coalesce(p_director_name, '')), ''),
        director_phone = nullif(trim(coalesce(p_director_phone, '')), ''),
        sales_status = p_sales_status,
        sales_next_contact = p_sales_next_contact,
        sales_note = coalesce(p_sales_note, ''),
        sales_promised = coalesce(p_sales_promised, ''),
        sales_needed_from_client = coalesce(p_sales_needed_from_client, ''),
        sales_owner = coalesce(p_sales_owner, ''),
        updated_at = now()
    where id = p_school_id;

  if not found then
    raise exception 'School not found.';
  end if;

  return query select * from public.schools where id = p_school_id;
end;
$$;

grant execute on function public.public_superadmin_update_school_sales(text, text, text, text, text, date, text, text, text, text, text) to anon, authenticated;

create or replace function public.public_superadmin_update_school_access(
  p_school_id text,
  p_access_status text,
  p_access_paid_until date,
  p_access_last_paid_at date,
  p_access_last_amount integer,
  p_access_payment_note text,
  p_access_payment_history jsonb,
  p_superadmin_password text
)
returns setof public.schools
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  if p_access_status not in ('trial', 'active', 'expires_soon', 'overdue', 'blocked') then
    raise exception 'Access status is invalid.';
  end if;

  if jsonb_typeof(coalesce(p_access_payment_history, '[]'::jsonb)) <> 'array' then
    raise exception 'Payment history is invalid.';
  end if;

  update public.schools
    set access_status = p_access_status,
        access_paid_until = p_access_paid_until,
        access_last_paid_at = p_access_last_paid_at,
        access_last_amount = p_access_last_amount,
        access_payment_note = coalesce(p_access_payment_note, ''),
        access_payment_history = coalesce(p_access_payment_history, '[]'::jsonb),
        is_active = p_access_status <> 'blocked',
        updated_at = now()
    where id = p_school_id;

  if not found then
    raise exception 'School not found.';
  end if;

  return query select * from public.schools where id = p_school_id;
end;
$$;

grant execute on function public.public_superadmin_update_school_access(text, text, date, date, integer, text, jsonb, text) to anon, authenticated;

-- END DRIVEDESK_SAFE_PATCH

create extension if not exists "pgcrypto";

drop table if exists public.slot_locks cascade;
drop table if exists public.bookings cascade;
drop table if exists public.booking_groups cascade;
drop table if exists public.slots cascade;
drop table if exists public.students cascade;
drop table if exists public.instructors cascade;
drop table if exists public.branches cascade;
drop table if exists public.schools cascade;
drop table if exists public.staff_access_credentials cascade;

drop function if exists public.public_create_booking(text, text, text, text[]);
drop function if exists public.public_cancel_booking(text);
drop function if exists public.public_cancel_booking(text, text);
drop function if exists public.public_complete_booking(text);
drop function if exists public.public_complete_booking(text, text);
drop function if exists public.public_no_show_booking(text);
drop function if exists public.public_no_show_booking(text, text);
drop function if exists public.public_reschedule_booking(text, text);
drop function if exists public.public_reschedule_booking(text, text, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer, text);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer, text, text);
drop function if exists public.public_update_slot_status(text, text);
drop function if exists public.public_update_slot_status(text, text, text);
drop function if exists public.public_delete_slot(text);
drop function if exists public.public_delete_slot(text, text);
drop function if exists public.public_upsert_branch(text, text, text, text, text, boolean, text);
drop function if exists public.public_delete_branch(text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text);
drop function if exists public.public_update_instructor_active(text, boolean, text);
drop function if exists public.public_admin_update_student(text, text, text, text, text, text, text, text, text, text[], text, text, date, date, date, date, timestamptz, text, text);
drop function if exists public.public_admin_list_students(text, text);
drop function if exists public.public_get_student_progress(text, text);
drop function if exists public.public_upsert_student_progress(text, text, text, integer, integer, integer, integer, boolean, date, text, date, text, text, timestamptz, text);
drop function if exists public.public_get_student_documents(text, text);
drop function if exists public.public_upsert_student_documents(jsonb, text);
drop function if exists public.public_admin_list_student_requests(text, text);
drop function if exists public.public_create_student_request(text, text, text, text, text, text, text, text, timestamptz, timestamptz);
drop function if exists public.public_update_student_request_status(text, text, text, timestamptz, text);
drop function if exists public.public_update_student_profile(text, text, text, text, text, text);
drop function if exists public.public_update_student_profile(text, text, text, text, text, text, text[], text, text, date, date, date, date);
drop function if exists public.public_login_student(text, text, text);
drop function if exists public.public_request_branch_change(text, text, text);
drop function if exists public.private_assert_admin_password(text);

create table public.staff_access_credentials (
  role text primary key,
  password_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.staff_access_credentials (role, password_sha256) values
  ('admin', '94754e78d07756488a78665a5b7bb3a1d636dabb002e682e4f8fac946250603d'),
  ('superadmin', 'a9979a4f54ede620455a9ea469844e45ba9054da9ce92822b7ebb33436728c5d');

create or replace function public.private_assert_admin_password(p_staff_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
begin
  select password_sha256
    into v_expected
    from public.staff_access_credentials
    where role = 'admin';

  if v_expected is null
    or encode(extensions.digest(coalesce(p_staff_password, ''), 'sha256'), 'hex') <> v_expected then
    raise exception 'Admin access denied.';
  end if;
end;
$$;

create table public.schools (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  logo_url text,
  primary_color text default '#4455C4',
  booking_limit_enabled boolean not null default true,
  max_active_bookings_per_student integer not null default 2,
  branch_selection_mode text not null default 'student_choice'
    check (branch_selection_mode in ('student_choice', 'fixed_first')),
  max_slots_per_booking integer not null default 1 check (max_slots_per_booking between 1 and 6),
  default_lesson_duration integer not null default 90 check (default_lesson_duration between 30 and 240),
  enabled_category_codes text[] not null default array['B'],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  name text not null,
  address text not null,
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.instructors (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete restrict,
  name text not null,
  phone text not null default '',
  email text not null default '',
  token text not null unique,
  bio text not null default '',
  experience integer not null default 0,
  is_active boolean not null default true,
  categories text[] not null default '{}',
  avatar_initials text not null default '',
  avatar_color text not null default '#4455C4',
  car text,
  transmission text check (transmission in ('manual', 'auto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  name text not null,
  phone text not null,
  normalized_phone text not null,
  email text not null default '',
  password_hash text,
  avatar_url text,
  assigned_branch_id text references public.branches(id) on delete set null,
  assigned_instructor_id text references public.instructors(id) on delete set null,
  category_codes text[],
  training_stage text check (training_stage in ('new_request', 'awaiting_contract', 'contract_signed', 'theory', 'training_active', 'no_bookings', 'has_debt', 'missing_documents', 'practice_ground', 'city', 'theory_completed', 'practice_active', 'practice_completed', 'exam_prep', 'ready_for_internal_exam', 'internal_exam_passed', 'ready_for_gibdd', 'exam', 'training_completed', 'completed', 'archived', 'refused', 'frozen')),
  group_name text,
  training_start_date date,
  driving_start_date date,
  training_end_date date,
  driving_end_date date,
  branch_change_requested_at timestamptz,
  branch_change_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, normalized_phone)
);

create table public.slots (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  instructor_id text not null references public.instructors(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete restrict,
  date date not null,
  time time not null,
  duration integer not null default 90 check (duration between 30 and 240),
  lesson_type text not null default 'driving' check (lesson_type in ('driving', 'main', 'extra', 'practice_ground', 'city', 'exam_route', 'internal_exam', 'retake', 'mistakes')),
  status text not null default 'available' check (status in ('available', 'booked', 'cancelled')),
  booking_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instructor_id, date, time)
);

create table public.booking_groups (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  student_id text not null references public.students(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'partially_cancelled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id text primary key,
  booking_group_id text references public.booking_groups(id) on delete set null,
  school_id text not null references public.schools(id) on delete cascade,
  slot_id text not null references public.slots(id) on delete restrict,
  instructor_id text not null references public.instructors(id) on delete restrict,
  branch_id text not null references public.branches(id) on delete restrict,
  student_id text not null references public.students(id) on delete restrict,
  student_name text not null,
  student_phone text not null,
  student_email text not null default '',
  status text not null default 'active' check (status in ('active', 'cancelled', 'completed', 'no_show')),
  notes text,
  comment text,
  rescheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_progress (
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

create table public.student_documents (
  student_id text not null references public.students(id) on delete cascade,
  type text not null check (type in ('passport', 'medical_certificate', 'snils', 'contract', 'photo', 'state_fee')),
  status text not null default 'missing' check (status in ('missing', 'pending', 'provided', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  primary key (student_id, type)
);

create table public.student_requests (
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

alter table public.slots
  add constraint slots_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete set null;

create table public.slot_locks (
  slot_id text primary key references public.slots(id) on delete cascade,
  session_id text not null,
  expires_at timestamptz not null
);

create index branches_school_id_idx on public.branches(school_id);
create index instructors_school_id_idx on public.instructors(school_id);
create index instructors_branch_id_idx on public.instructors(branch_id);
create index students_school_id_idx on public.students(school_id);
create index students_school_phone_idx on public.students(school_id, normalized_phone);
create index slots_school_date_idx on public.slots(school_id, date);
create index slots_instructor_date_idx on public.slots(instructor_id, date);
create index bookings_school_id_idx on public.bookings(school_id);
create index bookings_student_id_idx on public.bookings(student_id);
create index student_progress_school_id_idx on public.student_progress(school_id);
create index student_requests_school_id_idx on public.student_requests(school_id);
create index student_requests_student_id_idx on public.student_requests(student_id);
create unique index bookings_one_active_per_slot_idx on public.bookings(slot_id) where status = 'active';

insert into public.schools (
  id, name, slug, description, phone, email, address, primary_color,
  booking_limit_enabled, max_active_bookings_per_student, branch_selection_mode,
  max_slots_per_booking, default_lesson_duration, enabled_category_codes, is_active, created_at
) values (
  'school-virazh',
  'Автошкола «Вираж»',
  'virazh',
  'Профессиональная подготовка водителей с 2008 года. Современные автомобили, опытные инструкторы, удобное расписание.',
  '+7 (495) 123-45-67',
  'info@virazh-school.ru',
  'г. Москва, ул. Ленина, 45',
  '#4455C4',
  true,
  2,
  'student_choice',
  2,
  90,
  array['B', 'A', 'C'],
  true,
  '2024-01-15T10:00:00Z'
);

insert into public.branches (id, school_id, name, address, phone, is_active) values
  ('branch-central', 'school-virazh', 'Центральный офис', 'ул. Ленина, 45', '+7 (495) 123-45-67', true),
  ('branch-north', 'school-virazh', 'Северное отделение', 'ул. Гагарина, 112', '+7 (495) 234-56-78', true),
  ('branch-west', 'school-virazh', 'Западное отделение', 'пр. Победы, 78', '+7 (495) 345-67-89', true);

insert into public.instructors (
  id, school_id, branch_id, name, phone, email, token, bio, experience,
  is_active, categories, avatar_initials, avatar_color, car, transmission
) values
  (
    'inst-petrov', 'school-virazh', 'branch-central', 'Петров Алексей Иванович',
    '+7 (916) 111-22-33', 'petrov@virazh.ru', 'tok-petrov-2024',
    'Инструктор высшей категории, 15 лет за рулём учебного автомобиля. Специализируется на городском вождении и подготовке к экзамену.',
    15, true, array['B'], 'АП', '#2A6E4C', 'Lada Vesta', 'manual'
  ),
  (
    'inst-smirnova', 'school-virazh', 'branch-north', 'Смирнова Наталья Петровна',
    '+7 (916) 222-33-44', 'smirnova@virazh.ru', 'tok-smirnova-2024',
    'Педагог и инструктор с 8-летним стажем. Спокойный подход и понятные объяснения для начинающих водителей.',
    8, true, array['B'], 'НС', '#1F5239', 'Kia Rio', 'auto'
  ),
  (
    'inst-kozlov', 'school-virazh', 'branch-central', 'Козлов Игорь Владимирович',
    '+7 (916) 333-44-55', 'kozlov@virazh.ru', 'tok-kozlov-2024',
    'Бывший сотрудник ГИБДД, знает требования экзамена изнутри. 12 лет опыта инструктора.',
    12, true, array['B', 'C'], 'ИК', '#163B29', 'Hyundai Solaris', 'manual'
  ),
  (
    'inst-volkova', 'school-virazh', 'branch-west', 'Волкова Марина Сергеевна',
    '+7 (916) 444-55-66', 'volkova@virazh.ru', 'tok-volkova-2024',
    'Инструктор с 6-летним стажем. Хорошо работает с учениками, которым нужен спокойный темп обучения.',
    6, true, array['B'], 'МВ', '#3A8B62', 'Toyota Corolla', 'auto'
  ),
  (
    'inst-zakharov', 'school-virazh', 'branch-north', 'Захаров Дмитрий Николаевич',
    '+7 (916) 555-66-77', 'zakharov@virazh.ru', 'tok-zakharov-2024',
    'Опытный инструктор, 20 лет в профессии. Помогает уверенно подготовиться к экзамену и городскому маршруту.',
    20, true, array['B', 'C', 'D'], 'ДЗ', '#0E261A', 'Skoda Octavia', 'manual'
  );

insert into public.students (id, school_id, name, normalized_phone, phone, email) values
  ('stu-001', 'school-virazh', 'Иванова Анна Михайловна', '79161234567', '+79161234567', 'ivanova@mail.ru'),
  ('stu-002', 'school-virazh', 'Соколов Павел Андреевич', '79167654321', '+79167654321', 'sokolov@gmail.com'),
  ('stu-003', 'school-virazh', 'Новикова Елена Дмитриевна', '79169876543', '+79169876543', 'novikova@yandex.ru'),
  ('stu-004', 'school-virazh', 'Морозов Сергей Алексеевич', '79163456789', '+79163456789', 'morozov@mail.ru');

insert into public.slots (
  id, school_id, instructor_id, branch_id, date, time, duration, status
)
select
  'slot-' || i.id || '-' || to_char(current_date + d.day_offset, 'YYYYMMDD') || '-' || replace(t.time_value::text, ':', ''),
  i.school_id,
  i.id,
  i.branch_id,
  current_date + d.day_offset,
  t.time_value,
  90,
  'available'
from public.instructors i
cross join generate_series(1, 14) as d(day_offset)
cross join (
  values
    ('09:00'::time),
    ('10:30'::time),
    ('12:00'::time),
    ('13:30'::time),
    ('15:00'::time),
    ('16:30'::time),
    ('18:00'::time)
) as t(time_value)
where i.is_active = true
  and (
    (d.day_offset % 3 = 0 and t.time_value <= '15:00'::time)
    or (d.day_offset % 2 = 0 and t.time_value between '10:30'::time and '16:30'::time)
    or (d.day_offset % 2 = 1 and d.day_offset % 3 <> 0 and t.time_value <= '16:30'::time)
  );

create or replace function public.public_create_booking(
  p_school_id text,
  p_student_name text,
  p_student_phone text,
  p_slot_ids text[]
)
returns table (
  booking_group_id text,
  booking_id text,
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
  v_student_id text;
  v_group_id text;
  v_max_slots integer;
  v_booking_limit_enabled boolean;
  v_max_active_bookings integer;
  v_active_booking_count integer;
  v_slot_count integer;
  v_slot record;
  v_booking_id text;
begin
  if p_student_name is null or length(trim(p_student_name)) = 0 then
    raise exception 'Введите имя ученика.';
  end if;

  v_normalized_phone := regexp_replace(coalesce(p_student_phone, ''), '\D', '', 'g');
  if length(v_normalized_phone) = 11 and left(v_normalized_phone, 1) = '8' then
    v_normalized_phone := '7' || substring(v_normalized_phone from 2);
  elsif length(v_normalized_phone) = 10 and left(v_normalized_phone, 1) = '9' then
    v_normalized_phone := '7' || v_normalized_phone;
  end if;

  if v_normalized_phone !~ '^7[0-9]{10}$' then
    raise exception 'Введите корректный номер телефона.';
  end if;

  select max_slots_per_booking, booking_limit_enabled, max_active_bookings_per_student
    into v_max_slots, v_booking_limit_enabled, v_max_active_bookings
    from public.schools
    where id = p_school_id and is_active = true;

  if v_max_slots is null then
    raise exception 'Автошкола не найдена.';
  end if;

  select count(distinct selected_slot_id)
    into v_slot_count
    from unnest(p_slot_ids) as selected_slot_id;

  if v_slot_count = 0 then
    raise exception 'Выберите время занятия.';
  end if;

  if v_slot_count > v_max_slots then
    raise exception 'Выбрано слишком много занятий.';
  end if;

  if coalesce(v_booking_limit_enabled, true) and coalesce(v_max_active_bookings, 0) > 0 then
    select count(*)
      into v_active_booking_count
      from public.bookings b
      join public.slots s on s.id = b.slot_id
      where b.school_id = p_school_id
        and b.student_phone = v_normalized_phone
        and b.status = 'active'
        and ((s.date::timestamp + s.time) >= now());

    if v_active_booking_count + v_slot_count > v_max_active_bookings then
      raise exception 'У ученика уже есть максимум активных записей.';
    end if;
  end if;

  insert into public.students (id, school_id, name, phone, normalized_phone)
  values ('stu-' || replace(gen_random_uuid()::text, '-', ''), p_school_id, trim(p_student_name), v_normalized_phone, v_normalized_phone)
  on conflict (school_id, normalized_phone)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    updated_at = now()
  returning id into v_student_id;

  v_group_id := 'booking-group-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.booking_groups (id, school_id, student_id)
  values (v_group_id, p_school_id, v_student_id);

  for v_slot in
    select s.*
    from public.slots s
    where s.school_id = p_school_id
      and s.id in (select distinct selected_slot_id from unnest(p_slot_ids) as selected_slot_id)
    order by s.date, s.time
    for update
  loop
    if v_slot.status <> 'available' or v_slot.booking_id is not null then
      raise exception 'Один из выбранных слотов уже занят.';
    end if;

    if not exists (
      select 1
      from public.branches b
      join public.instructors i on i.id = v_slot.instructor_id
      where b.id = v_slot.branch_id
        and b.school_id = p_school_id
        and i.school_id = p_school_id
        and i.branch_id = v_slot.branch_id
        and b.is_active = true
        and i.is_active = true
    ) then
      raise exception 'Один из выбранных слотов больше недоступен.';
    end if;

    v_booking_id := 'booking-' || replace(gen_random_uuid()::text, '-', '');

    insert into public.bookings (
      id, booking_group_id, school_id, slot_id, instructor_id, branch_id,
      student_id, student_name, student_phone, student_email, status
    ) values (
      v_booking_id, v_group_id, p_school_id, v_slot.id, v_slot.instructor_id, v_slot.branch_id,
      v_student_id, trim(p_student_name), v_normalized_phone, '', 'active'
    );

    update public.slots as target_slot
      set status = 'booked',
          booking_id = v_booking_id,
          updated_at = now()
      where target_slot.id = v_slot.id
        and target_slot.status = 'available'
        and target_slot.booking_id is null;

    if not found then
      raise exception 'Этот слот только что заняли.';
    end if;

    booking_group_id := v_group_id;
    booking_id := v_booking_id;
    slot_id := v_slot.id;
    return next;
  end loop;

  if not found then
    raise exception 'Выбранные слоты не найдены.';
  end if;
end;
$$;

create or replace function public.public_cancel_booking(
  p_booking_id text,
  p_staff_password text
)
returns table (
  booking_id text,
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be cancelled.';
  end if;

  update public.bookings
    set status = 'cancelled',
        updated_at = now()
    where id = p_booking_id;

  update public.slots
    set status = 'available',
        booking_id = null,
        updated_at = now()
    where id = v_booking.slot_id;

  booking_id := p_booking_id;
  slot_id := v_booking.slot_id;
  return next;
end;
$$;

create or replace function public.public_complete_booking(
  p_booking_id text,
  p_staff_password text
)
returns table (
  booking_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be completed.';
  end if;

  update public.bookings
    set status = 'completed',
        updated_at = now()
    where id = p_booking_id;

  booking_id := p_booking_id;
  return next;
end;
$$;

create or replace function public.public_no_show_booking(
  p_booking_id text,
  p_staff_password text
)
returns table (
  booking_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be marked as no-show.';
  end if;

  update public.bookings
    set status = 'no_show',
        updated_at = now()
    where id = p_booking_id;

  booking_id := p_booking_id;
  return next;
end;
$$;

create or replace function public.public_reschedule_booking(
  p_booking_id text,
  p_new_slot_id text,
  p_staff_password text
)
returns table (
  booking_id text,
  previous_slot_id text,
  new_slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_next_slot public.slots%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'Only active bookings can be rescheduled.';
  end if;

  select *
    into v_next_slot
    from public.slots
    where id = p_new_slot_id
    for update;

  if not found then
    raise exception 'New slot not found.';
  end if;

  if v_next_slot.status <> 'available' then
    raise exception 'New slot is already booked.';
  end if;

  if v_next_slot.date < current_date then
    raise exception 'New slot is in the past.';
  end if;

  if not exists (
    select 1
    from public.schools s
    join public.branches b on b.id = v_next_slot.branch_id
    join public.instructors i on i.id = v_next_slot.instructor_id
    where s.id = v_booking.school_id
      and v_next_slot.school_id = v_booking.school_id
      and b.school_id = v_booking.school_id
      and i.school_id = v_booking.school_id
      and i.branch_id = v_next_slot.branch_id
      and s.is_active = true
      and b.is_active = true
      and i.is_active = true
  ) then
    raise exception 'New slot is no longer available.';
  end if;

  update public.slots
    set status = 'available',
        booking_id = null,
        updated_at = now()
    where id = v_booking.slot_id
      and booking_id = p_booking_id;

  update public.bookings
    set slot_id = v_next_slot.id,
        branch_id = v_next_slot.branch_id,
        instructor_id = v_next_slot.instructor_id,
        rescheduled_at = now(),
        updated_at = now()
    where id = p_booking_id;

  update public.slots
    set status = 'booked',
        booking_id = p_booking_id,
        updated_at = now()
    where id = v_next_slot.id;

  booking_id := p_booking_id;
  previous_slot_id := v_booking.slot_id;
  new_slot_id := v_next_slot.id;
  return next;
end;
$$;

create or replace function public.public_update_school_settings(
  p_school_id text,
  p_name text,
  p_slug text,
  p_description text,
  p_primary_color text,
  p_logo_url text,
  p_booking_limit_enabled boolean,
  p_max_active_bookings_per_student integer,
  p_branch_selection_mode text,
  p_max_slots_per_booking integer,
  p_default_lesson_duration integer,
  p_enabled_category_codes text[],
  p_staff_password text
)
returns table (
  school_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'School name is required.';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9-]+$' then
    raise exception 'School slug is invalid.';
  end if;

  if p_primary_color is not null and p_primary_color <> '' and p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Primary color is invalid.';
  end if;

  if p_max_active_bookings_per_student < 1 or p_max_active_bookings_per_student > 10 then
    raise exception 'Active bookings limit is invalid.';
  end if;

  if p_branch_selection_mode not in ('student_choice', 'fixed_first') then
    raise exception 'Branch selection mode is invalid.';
  end if;

  if p_max_slots_per_booking < 1 or p_max_slots_per_booking > 6 then
    raise exception 'Max slots per booking is invalid.';
  end if;

  if p_default_lesson_duration < 30 or p_default_lesson_duration > 240 then
    raise exception 'Lesson duration is invalid.';
  end if;

  update public.schools
    set name = trim(p_name),
        slug = trim(p_slug),
        description = coalesce(p_description, ''),
        primary_color = nullif(p_primary_color, ''),
        logo_url = nullif(p_logo_url, ''),
        booking_limit_enabled = coalesce(p_booking_limit_enabled, true),
        max_active_bookings_per_student = p_max_active_bookings_per_student,
        branch_selection_mode = p_branch_selection_mode,
        max_slots_per_booking = p_max_slots_per_booking,
        default_lesson_duration = p_default_lesson_duration,
        enabled_category_codes = coalesce(nullif(p_enabled_category_codes, '{}'), array['B']),
        updated_at = now()
    where id = p_school_id;

  if not found then
    raise exception 'School not found.';
  end if;

  school_id := p_school_id;
  return next;
end;
$$;

create or replace function public.public_create_slot(
  p_slot_id text,
  p_school_id text,
  p_branch_id text,
  p_instructor_id text,
  p_date text,
  p_start_time text,
  p_duration integer,
  p_lesson_type text,
  p_staff_password text
)
returns table (
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_date date;
  v_slot_time time;
begin
  perform public.private_assert_admin_password(p_staff_password);

  v_slot_date := p_date::date;
  v_slot_time := p_start_time::time;

  if v_slot_date < current_date then
    raise exception 'Slot date is in the past.';
  end if;

  if p_duration < 30 or p_duration > 240 or p_duration % 15 <> 0 then
    raise exception 'Slot duration is invalid.';
  end if;

  if p_lesson_type not in ('driving', 'main', 'extra', 'practice_ground', 'city', 'exam_route', 'internal_exam', 'retake', 'mistakes') then
    raise exception 'Slot lesson type is invalid.';
  end if;

  if not exists (
    select 1
    from public.branches
    where id = p_branch_id
      and school_id = p_school_id
      and is_active = true
  ) then
    raise exception 'Branch is not available.';
  end if;

  if not exists (
    select 1
    from public.instructors
    where id = p_instructor_id
      and school_id = p_school_id
      and branch_id = p_branch_id
      and is_active = true
  ) then
    raise exception 'Instructor is not available for this branch.';
  end if;

  if exists (
    select 1
    from public.slots
    where school_id = p_school_id
      and instructor_id = p_instructor_id
      and date = v_slot_date
      and status <> 'cancelled'
      and v_slot_time < (time + (duration || ' minutes')::interval)
      and time < (v_slot_time + (p_duration || ' minutes')::interval)
  ) then
    raise exception 'Slot overlaps existing instructor time.';
  end if;

  insert into public.slots (
    id, school_id, branch_id, instructor_id, date, time, duration, lesson_type, status
  ) values (
    p_slot_id, p_school_id, p_branch_id, p_instructor_id, v_slot_date, v_slot_time, p_duration, p_lesson_type, 'available'
  );

  slot_id := p_slot_id;
  return next;
exception
  when unique_violation then
    raise exception 'Slot already exists.';
end;
$$;

create or replace function public.public_update_slot_status(
  p_slot_id text,
  p_status text,
  p_staff_password text
)
returns table (
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_status not in ('available', 'booked', 'cancelled') then
    raise exception 'Slot status is invalid.';
  end if;

  select *
    into v_slot
    from public.slots
    where id = p_slot_id
    for update;

  if not found then
    raise exception 'Slot not found.';
  end if;

  if p_status = 'available' and v_slot.booking_id is not null then
    raise exception 'Booked slot cannot be manually released.';
  end if;

  if p_status = 'cancelled' and v_slot.booking_id is not null then
    raise exception 'Booked slot cannot be cancelled without booking handling.';
  end if;

  update public.slots
    set status = p_status,
        booking_id = case when p_status = 'available' then null else booking_id end,
        updated_at = now()
    where id = p_slot_id;

  slot_id := p_slot_id;
  return next;
end;
$$;

create or replace function public.public_delete_slot(
  p_slot_id text,
  p_staff_password text
)
returns table (
  slot_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select *
    into v_slot
    from public.slots
    where id = p_slot_id
    for update;

  if not found then
    raise exception 'Slot not found.';
  end if;

  if v_slot.booking_id is not null or v_slot.status = 'booked' then
    raise exception 'Booked slot cannot be deleted.';
  end if;

  delete from public.slots where id = p_slot_id;

  slot_id := p_slot_id;
  return next;
end;
$$;

create or replace function public.public_upsert_branch(
  p_branch_id text,
  p_school_id text,
  p_name text,
  p_address text,
  p_phone text,
  p_is_active boolean,
  p_staff_password text
)
returns table (
  branch_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Branch name is required.';
  end if;

  if not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;

  insert into public.branches (
    id, school_id, name, address, phone, is_active
  ) values (
    p_branch_id, p_school_id, trim(p_name), coalesce(p_address, ''), coalesce(p_phone, ''), coalesce(p_is_active, true)
  )
  on conflict (id)
  do update set
    name = excluded.name,
    address = excluded.address,
    phone = excluded.phone,
    is_active = excluded.is_active,
    updated_at = now();

  branch_id := p_branch_id;
  return next;
end;
$$;

create or replace function public.public_delete_branch(
  p_branch_id text,
  p_staff_password text
)
returns table (
  branch_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if exists (select 1 from public.instructors where branch_id = p_branch_id)
    or exists (select 1 from public.slots where branch_id = p_branch_id)
    or exists (select 1 from public.bookings where branch_id = p_branch_id) then
    raise exception 'Branch has related instructors, slots or bookings.';
  end if;

  delete from public.branches where id = p_branch_id;

  if not found then
    raise exception 'Branch not found.';
  end if;

  branch_id := p_branch_id;
  return next;
end;
$$;

create or replace function public.public_upsert_instructor(
  p_instructor_id text,
  p_school_id text,
  p_branch_id text,
  p_name text,
  p_phone text,
  p_email text,
  p_token text,
  p_bio text,
  p_is_active boolean,
  p_car text,
  p_transmission text,
  p_categories text[],
  p_staff_password text
)
returns table (
  instructor_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Instructor name is required.';
  end if;

  if p_transmission is not null and p_transmission <> '' and p_transmission not in ('manual', 'auto') then
    raise exception 'Transmission is invalid.';
  end if;

  if not exists (
    select 1 from public.branches
    where id = p_branch_id
      and school_id = p_school_id
  ) then
    raise exception 'Branch not found.';
  end if;

  insert into public.instructors (
    id, school_id, branch_id, name, phone, email, token, bio, experience,
    is_active, categories, avatar_initials, avatar_color, car, transmission
  ) values (
    p_instructor_id,
    p_school_id,
    p_branch_id,
    trim(p_name),
    coalesce(p_phone, ''),
    coalesce(p_email, ''),
    p_token,
    coalesce(p_bio, ''),
    0,
    coalesce(p_is_active, true),
    coalesce(nullif(p_categories, '{}'), array['B']),
    upper(left(trim(p_name), 1)),
    '#2a5d86',
    nullif(p_car, ''),
    nullif(p_transmission, '')
  )
  on conflict (id)
  do update set
    branch_id = excluded.branch_id,
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    bio = excluded.bio,
    is_active = excluded.is_active,
    categories = excluded.categories,
    car = excluded.car,
    transmission = excluded.transmission,
    updated_at = now();

  instructor_id := p_instructor_id;
  return next;
end;
$$;

create or replace function public.public_update_instructor_active(
  p_instructor_id text,
  p_is_active boolean,
  p_staff_password text
)
returns table (
  instructor_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);

  update public.instructors
    set is_active = coalesce(p_is_active, is_active),
        updated_at = now()
    where id = p_instructor_id;

  if not found then
    raise exception 'Instructor not found.';
  end if;

  instructor_id := p_instructor_id;
  return next;
end;
$$;

create or replace function public.public_update_student_profile(
  p_school_id text,
  p_phone text,
  p_name text,
  p_email text,
  p_password text,
  p_avatar_url text,
  p_category_codes text[] default null,
  p_training_stage text default null,
  p_group_name text default null,
  p_training_start_date date default null,
  p_driving_start_date date default null,
  p_training_end_date date default null,
  p_driving_end_date date default null
)
returns table (
  student_id text,
  student_phone text,
  profile_ready boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
  v_student_id text;
begin
  v_normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_normalized_phone) = 11 and left(v_normalized_phone, 1) = '8' then
    v_normalized_phone := '7' || substring(v_normalized_phone from 2);
  elsif length(v_normalized_phone) = 10 and left(v_normalized_phone, 1) = '9' then
    v_normalized_phone := '7' || v_normalized_phone;
  end if;

  if v_normalized_phone !~ '^7[0-9]{10}$' then
    raise exception 'Phone is invalid.';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Student name is required.';
  end if;

  if p_training_stage is not null and p_training_stage not in ('new_request', 'awaiting_contract', 'contract_signed', 'theory', 'training_active', 'no_bookings', 'has_debt', 'missing_documents', 'practice_ground', 'city', 'theory_completed', 'practice_active', 'practice_completed', 'exam_prep', 'ready_for_internal_exam', 'internal_exam_passed', 'ready_for_gibdd', 'exam', 'training_completed', 'completed', 'archived', 'refused', 'frozen') then
    raise exception 'Student training stage is invalid.';
  end if;

  if not exists (
    select 1 from public.students
    where school_id = p_school_id
      and normalized_phone = v_normalized_phone
      and password_hash is not null
  ) and (p_password is null or length(p_password) < 6) then
    raise exception 'Password is too short.';
  end if;

  insert into public.students (
    id, school_id, name, phone, normalized_phone, email, password_hash, avatar_url,
    category_codes, training_stage, group_name, training_start_date, driving_start_date,
    training_end_date, driving_end_date
  ) values (
    'stu-' || replace(gen_random_uuid()::text, '-', ''),
    p_school_id,
    trim(p_name),
    v_normalized_phone,
    v_normalized_phone,
    coalesce(trim(p_email), ''),
    case when p_password is not null and length(p_password) >= 6 then extensions.crypt(p_password, extensions.gen_salt('bf')) else null end,
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    nullif(p_category_codes, '{}'), p_training_stage, p_group_name, p_training_start_date, p_driving_start_date,
    p_training_end_date, p_driving_end_date
  )
  on conflict (school_id, normalized_phone)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    password_hash = coalesce(excluded.password_hash, public.students.password_hash),
    avatar_url = excluded.avatar_url,
    category_codes = coalesce(nullif(p_category_codes, '{}'), public.students.category_codes),
    training_stage = coalesce(p_training_stage, public.students.training_stage),
    group_name = coalesce(p_group_name, public.students.group_name),
    training_start_date = coalesce(p_training_start_date, public.students.training_start_date),
    driving_start_date = coalesce(p_driving_start_date, public.students.driving_start_date),
    training_end_date = coalesce(p_training_end_date, public.students.training_end_date),
    driving_end_date = coalesce(p_driving_end_date, public.students.driving_end_date),
    updated_at = now()
  returning public.students.id into v_student_id;

  student_id := v_student_id;
  student_phone := v_normalized_phone;
  profile_ready := true;
  return next;
end;
$$;

create or replace function public.public_login_student(
  p_school_id text,
  p_phone text,
  p_password text
)
returns table (
  student_id text,
  name text,
  phone text,
  email text,
  avatar_url text,
  assigned_branch_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
begin
  v_normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_normalized_phone) = 11 and left(v_normalized_phone, 1) = '8' then
    v_normalized_phone := '7' || substring(v_normalized_phone from 2);
  elsif length(v_normalized_phone) = 10 and left(v_normalized_phone, 1) = '9' then
    v_normalized_phone := '7' || v_normalized_phone;
  end if;

  return query
  select s.id, s.name, s.phone, s.email, s.avatar_url, s.assigned_branch_id
  from public.students s
  where s.school_id = p_school_id
    and s.normalized_phone = v_normalized_phone
    and s.password_hash is not null
    and s.password_hash = extensions.crypt(p_password, s.password_hash)
  limit 1;
end;
$$;

create or replace function public.public_request_branch_change(
  p_school_id text,
  p_phone text,
  p_note text
)
returns table (
  student_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
begin
  v_normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_normalized_phone) = 11 and left(v_normalized_phone, 1) = '8' then
    v_normalized_phone := '7' || substring(v_normalized_phone from 2);
  elsif length(v_normalized_phone) = 10 and left(v_normalized_phone, 1) = '9' then
    v_normalized_phone := '7' || v_normalized_phone;
  end if;

  update public.students
    set branch_change_requested_at = now(),
        branch_change_note = nullif(trim(coalesce(p_note, '')), ''),
        updated_at = now()
    where school_id = p_school_id
      and normalized_phone = v_normalized_phone
    returning id into student_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  return next;
end;
$$;

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

  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and school_id = p_school_id
  ) then
    raise exception 'Student not found.';
  end if;

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
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb)) as document
    where document->>'type' not in ('passport', 'medical_certificate', 'snils', 'contract', 'photo', 'state_fee')
       or document->>'status' not in ('missing', 'pending', 'provided', 'approved', 'rejected')
       or not exists (select 1 from public.students where id = document->>'student_id')
  ) then
    raise exception 'Student document payload is invalid.';
  end if;
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

  if p_status not in ('new', 'reviewing', 'resolved', 'rejected') then
    raise exception 'Student request status is invalid.';
  end if;

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

alter table public.schools enable row level security;
alter table public.staff_access_credentials enable row level security;
alter table public.branches enable row level security;
alter table public.instructors enable row level security;
alter table public.students enable row level security;
alter table public.slots enable row level security;
alter table public.booking_groups enable row level security;
alter table public.bookings enable row level security;
alter table public.slot_locks enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_documents enable row level security;
alter table public.student_requests enable row level security;

create policy "Public can read active schools"
  on public.schools for select
  using (is_active = true);

create policy "Public can read active branches"
  on public.branches for select
  using (is_active = true);

create policy "Public can read active instructors"
  on public.instructors for select
  using (is_active = true);

create policy "Public can read slots"
  on public.slots for select
  using (true);

create or replace function public.public_admin_update_student(
  p_student_id text,
  p_school_id text,
  p_name text,
  p_phone text,
  p_normalized_phone text,
  p_email text,
  p_avatar_url text,
  p_assigned_branch_id text,
  p_assigned_instructor_id text,
  p_category_codes text[],
  p_training_stage text,
  p_group_name text,
  p_training_start_date date,
  p_driving_start_date date,
  p_training_end_date date,
  p_driving_end_date date,
  p_branch_change_requested_at timestamptz,
  p_branch_change_note text,
  p_staff_password text
)
returns table (student_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id text;
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Student name is required.';
  end if;

  if coalesce(p_normalized_phone, '') !~ '^7[0-9]{10}$' then
    raise exception 'Student phone is invalid.';
  end if;

  if p_training_stage is not null and p_training_stage not in ('new_request', 'awaiting_contract', 'contract_signed', 'theory', 'training_active', 'no_bookings', 'has_debt', 'missing_documents', 'practice_ground', 'city', 'theory_completed', 'practice_active', 'practice_completed', 'exam_prep', 'ready_for_internal_exam', 'internal_exam_passed', 'ready_for_gibdd', 'exam', 'training_completed', 'completed', 'archived', 'refused', 'frozen') then
    raise exception 'Student training stage is invalid.';
  end if;

  if p_assigned_instructor_id is not null and not exists (
    select 1
    from public.instructors
    where id = p_assigned_instructor_id
      and school_id = p_school_id
      and (p_assigned_branch_id is null or branch_id = p_assigned_branch_id)
  ) then
    raise exception 'Assigned instructor is invalid.';
  end if;

  if p_assigned_branch_id is not null and not exists (
    select 1 from public.branches where id = p_assigned_branch_id and school_id = p_school_id
  ) then
    raise exception 'Assigned branch is invalid.';
  end if;

  select id
    into v_existing_id
    from public.students
    where school_id = p_school_id
      and normalized_phone = p_normalized_phone
    limit 1
    for update;

  if v_existing_id is not null and v_existing_id <> p_student_id then
    update public.students
      set name = trim(p_name),
          phone = coalesce(p_phone, ''),
          normalized_phone = coalesce(p_normalized_phone, ''),
          email = coalesce(p_email, ''),
          avatar_url = p_avatar_url,
          assigned_branch_id = p_assigned_branch_id,
          assigned_instructor_id = p_assigned_instructor_id,
          category_codes = coalesce(nullif(p_category_codes, '{}'), array['B']),
          training_stage = p_training_stage,
          group_name = coalesce(p_group_name, ''),
          training_start_date = p_training_start_date,
          driving_start_date = p_driving_start_date,
          training_end_date = p_training_end_date,
          driving_end_date = p_driving_end_date,
          branch_change_requested_at = p_branch_change_requested_at,
          branch_change_note = p_branch_change_note,
          updated_at = now()
      where id = v_existing_id
        and school_id = p_school_id;

    student_id := v_existing_id;
    return next;
    return;
  end if;

  insert into public.students (
    id, school_id, name, phone, normalized_phone, email, avatar_url,
    assigned_branch_id, assigned_instructor_id, category_codes, training_stage, group_name,
    training_start_date, driving_start_date, training_end_date, driving_end_date,
    branch_change_requested_at, branch_change_note
  ) values (
    p_student_id, p_school_id, trim(p_name), coalesce(p_phone, ''), coalesce(p_normalized_phone, ''), coalesce(p_email, ''), p_avatar_url,
    p_assigned_branch_id, p_assigned_instructor_id, coalesce(nullif(p_category_codes, '{}'), array['B']), p_training_stage, coalesce(p_group_name, ''),
    p_training_start_date, p_driving_start_date, p_training_end_date, p_driving_end_date,
    p_branch_change_requested_at, p_branch_change_note
  )
  on conflict (id)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    normalized_phone = excluded.normalized_phone,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    assigned_branch_id = excluded.assigned_branch_id,
    assigned_instructor_id = excluded.assigned_instructor_id,
    category_codes = excluded.category_codes,
    training_stage = excluded.training_stage,
    group_name = excluded.group_name,
    training_start_date = excluded.training_start_date,
    driving_start_date = excluded.driving_start_date,
    training_end_date = excluded.training_end_date,
    driving_end_date = excluded.driving_end_date,
    branch_change_requested_at = excluded.branch_change_requested_at,
    branch_change_note = excluded.branch_change_note,
    updated_at = now()
  returning id into student_id;

  return next;
end;
$$;
create or replace function public.public_admin_list_student_requests(
  p_school_id text,
  p_staff_password text
)
returns setof public.student_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.student_requests where school_id = p_school_id order by created_at desc;
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

  if p_booking_id is not null and not exists (
    select 1
    from public.bookings
    where id = p_booking_id
      and student_id = p_student_id
      and school_id = p_school_id
  ) then
    raise exception 'Booking not found.';
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

create or replace function public.public_get_booking_group(p_booking_id text)
returns table (
  id text, booking_group_id text, school_id text, slot_id text, instructor_id text, branch_id text, student_id text,
  student_name text, student_phone text, student_email text, status text, notes text, comment text, rescheduled_at timestamptz, created_at timestamptz, updated_at timestamptz,
  school_name text, school_slug text, school_description text, school_phone text, school_email text, school_address text, school_logo_url text, school_primary_color text,
  school_booking_limit_enabled boolean, school_max_active_bookings_per_student integer, school_branch_selection_mode text, school_max_slots_per_booking integer, school_default_lesson_duration integer, school_enabled_category_codes text[], school_is_active boolean, school_created_at timestamptz, school_updated_at timestamptz,
  branch_school_id text, branch_name text, branch_address text, branch_phone text, branch_is_active boolean,
  instructor_school_id text, instructor_branch_id text, instructor_name text, instructor_phone text, instructor_email text, instructor_bio text, instructor_experience integer, instructor_is_active boolean, instructor_categories text[], instructor_avatar_initials text, instructor_avatar_color text, instructor_car text, instructor_transmission text,
  slot_school_id text, slot_instructor_id text, slot_branch_id text, slot_date date, slot_time time, slot_duration integer, slot_lesson_type text, slot_status text, slot_booking_id text, slot_created_at timestamptz,
  student_school_id text
)
language sql
security definer
set search_path = public
as $$
  with first_booking as (
    select b.booking_group_id from public.bookings b where b.id = p_booking_id
  )
  select b.id, b.booking_group_id, b.school_id, b.slot_id, b.instructor_id, b.branch_id, b.student_id,
    case when length(trim(coalesce(b.student_name, ''))) > 0 then left(trim(b.student_name), 1) || '.' else 'Ученик' end, case when length(regexp_replace(coalesce(b.student_phone, ''), '\D', '', 'g')) >= 4 then '••••' || right(regexp_replace(b.student_phone, '\D', '', 'g'), 4) else '' end, '', b.status, b.notes, b.comment, b.rescheduled_at, b.created_at, b.updated_at,
    s.name, s.slug, s.description, s.phone, s.email, s.address, s.logo_url, s.primary_color,
    s.booking_limit_enabled, s.max_active_bookings_per_student, s.branch_selection_mode, s.max_slots_per_booking, s.default_lesson_duration, s.enabled_category_codes, s.is_active, s.created_at, s.updated_at,
    br.school_id, br.name, br.address, br.phone, br.is_active,
    i.school_id, i.branch_id, i.name, i.phone, i.email, i.bio, i.experience, i.is_active, i.categories, i.avatar_initials, i.avatar_color, i.car, i.transmission,
    sl.school_id, sl.instructor_id, sl.branch_id, sl.date, sl.time, sl.duration, sl.lesson_type, sl.status, sl.booking_id, sl.created_at,
    st.school_id
  from public.bookings b
  join first_booking fb on (b.id = p_booking_id or (fb.booking_group_id is not null and b.booking_group_id = fb.booking_group_id))
  join public.schools s on s.id = b.school_id
  join public.branches br on br.id = b.branch_id
  join public.instructors i on i.id = b.instructor_id
  join public.slots sl on sl.id = b.slot_id
  join public.students st on st.id = b.student_id
  order by sl.date, sl.time;
$$;

create or replace function public.public_get_instructor_schedule(p_token text)
returns table (
  instructor_id text, instructor_school_id text, instructor_branch_id text, instructor_name text, instructor_phone text, instructor_bio text, instructor_experience integer, instructor_is_active boolean, instructor_categories text[], instructor_avatar_initials text, instructor_avatar_color text, instructor_car text, instructor_transmission text,
  branch_id text, branch_school_id text, branch_name text, branch_address text, branch_phone text, branch_is_active boolean,
  slot_id text, slot_school_id text, slot_instructor_id text, slot_branch_id text, slot_date date, slot_time time, slot_duration integer, slot_lesson_type text, slot_status text, slot_booking_id text, slot_created_at timestamptz,
  booking_id text, booking_group_id text, booking_school_id text, booking_slot_id text, booking_instructor_id text, booking_branch_id text, booking_student_id text, booking_student_label text, booking_status text, booking_created_at timestamptz, booking_updated_at timestamptz, booking_rescheduled_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.id, i.school_id, i.branch_id, i.name, i.phone, i.bio, i.experience, i.is_active, i.categories, i.avatar_initials, i.avatar_color, i.car, i.transmission,
    br.id, br.school_id, br.name, br.address, br.phone, br.is_active,
    sl.id, sl.school_id, sl.instructor_id, sl.branch_id, sl.date, sl.time, sl.duration, sl.lesson_type, sl.status, sl.booking_id, sl.created_at,
    b.id, b.booking_group_id, b.school_id, b.slot_id, b.instructor_id, b.branch_id, b.student_id, case when length(trim(coalesce(b.student_name, ''))) > 0 then left(trim(b.student_name), 1) || '.' else 'Ученик' end, b.status, b.created_at, b.updated_at, b.rescheduled_at
  from public.instructors i
  left join public.branches br on br.id = i.branch_id
  left join public.slots sl on sl.instructor_id = i.id
  left join public.bookings b on b.slot_id = sl.id and b.instructor_id = i.id
  where i.token = p_token
  order by sl.date, sl.time, b.created_at desc;
$$;

create or replace function public.public_admin_list_bookings(p_school_id text, p_staff_password text)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.bookings where school_id = p_school_id order by created_at desc;
end;
$$;

create or replace function public.public_admin_list_students(
  p_school_id text,
  p_staff_password text
)
returns setof public.students
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_admin_password(p_staff_password);
  return query select * from public.students where school_id = p_school_id order by created_at desc;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.schools to anon, authenticated;
grant select on public.branches to anon, authenticated;
grant select on public.instructors to anon, authenticated;
grant select on public.slots to anon, authenticated;
grant execute on function public.public_create_booking(text, text, text, text[]) to anon, authenticated;
grant execute on function public.public_cancel_booking(text, text) to anon, authenticated;
grant execute on function public.public_complete_booking(text, text) to anon, authenticated;
grant execute on function public.public_no_show_booking(text, text) to anon, authenticated;
grant execute on function public.public_reschedule_booking(text, text, text) to anon, authenticated;
grant execute on function public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text) to anon, authenticated;
grant execute on function public.public_create_slot(text, text, text, text, text, text, integer, text, text) to anon, authenticated;
grant execute on function public.public_update_slot_status(text, text, text) to anon, authenticated;
grant execute on function public.public_delete_slot(text, text) to anon, authenticated;
grant execute on function public.public_upsert_branch(text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.public_delete_branch(text, text) to anon, authenticated;
grant execute on function public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text) to anon, authenticated;
grant execute on function public.public_update_instructor_active(text, boolean, text) to anon, authenticated;
grant execute on function public.public_admin_update_student(text, text, text, text, text, text, text, text, text, text[], text, text, date, date, date, date, timestamptz, text, text) to anon, authenticated;
grant execute on function public.public_admin_list_students(text, text) to anon, authenticated;
grant execute on function public.public_get_student_progress(text, text) to anon, authenticated;
grant execute on function public.public_upsert_student_progress(text, text, text, integer, integer, integer, integer, boolean, date, text, date, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.public_get_student_documents(text, text) to anon, authenticated;
grant execute on function public.public_upsert_student_documents(jsonb, text) to anon, authenticated;
grant execute on function public.public_admin_list_student_requests(text, text) to anon, authenticated;
grant execute on function public.public_create_student_request(text, text, text, text, text, text, text, text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.public_update_student_request_status(text, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.public_get_booking_group(text) to anon, authenticated;
grant execute on function public.public_get_instructor_schedule(text) to anon, authenticated;
grant execute on function public.public_admin_list_bookings(text, text) to anon, authenticated;
grant execute on function public.public_update_student_profile(text, text, text, text, text, text, text[], text, text, date, date, date, date) to anon, authenticated;
grant execute on function public.public_login_student(text, text, text) to anon, authenticated;
grant execute on function public.public_request_branch_change(text, text, text) to anon, authenticated;
