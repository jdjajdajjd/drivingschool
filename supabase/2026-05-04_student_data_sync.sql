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
begin
  perform public.private_assert_admin_password(p_staff_password);

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Student name is required.';
  end if;

  if p_training_stage is not null and p_training_stage not in ('theory', 'practice_ground', 'city', 'exam_prep', 'exam', 'completed') then
    raise exception 'Student training stage is invalid.';
  end if;

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
        group_name = p_group_name,
        training_start_date = p_training_start_date,
        driving_start_date = p_driving_start_date,
        training_end_date = p_training_end_date,
        driving_end_date = p_driving_end_date,
        branch_change_requested_at = p_branch_change_requested_at,
        branch_change_note = p_branch_change_note,
        updated_at = now()
    where id = p_student_id
      and school_id = p_school_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  student_id := p_student_id;
  return next;
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
    b.student_name, b.student_phone, b.student_email, b.status, b.notes, b.comment, b.rescheduled_at, b.created_at, b.updated_at,
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
    b.id, b.booking_group_id, b.school_id, b.slot_id, b.instructor_id, b.branch_id, b.student_id, left(trim(b.student_name), 1) || '.', b.status, b.created_at, b.updated_at, b.rescheduled_at
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

drop function if exists public.public_update_student_profile(text, text, text, text, text, text);
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

  if p_training_stage is not null and p_training_stage not in ('theory', 'practice_ground', 'city', 'exam_prep', 'exam', 'completed') then
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
    category_codes = coalesce(excluded.category_codes, public.students.category_codes),
    training_stage = coalesce(excluded.training_stage, public.students.training_stage),
    group_name = coalesce(excluded.group_name, public.students.group_name),
    training_start_date = coalesce(excluded.training_start_date, public.students.training_start_date),
    driving_start_date = coalesce(excluded.driving_start_date, public.students.driving_start_date),
    training_end_date = coalesce(excluded.training_end_date, public.students.training_end_date),
    driving_end_date = coalesce(excluded.driving_end_date, public.students.driving_end_date),
    updated_at = now()
  returning public.students.id into v_student_id;

  student_id := v_student_id;
  student_phone := v_normalized_phone;
  profile_ready := true;
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
