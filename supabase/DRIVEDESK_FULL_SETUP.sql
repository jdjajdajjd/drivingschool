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

insert into public.staff_access_credentials (role, password_sha256) values
  ('admin', '94754e78d07756488a78665a5b7bb3a1d636dabb002e682e4f8fac946250603d'),
  ('superadmin', 'ddc85ebe831f77142817db5a756d377c954b92c87c0c1e5fa4746a872b7f6588')
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
    or encode(digest(coalesce(p_staff_password, ''), 'sha256'), 'hex') <> v_expected then
    raise exception 'Admin access denied.';
  end if;
end;
$$;

drop function if exists public.public_cancel_booking(text, text);
drop function if exists public.public_complete_booking(text, text);
drop function if exists public.public_reschedule_booking(text, text, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer, text);
drop function if exists public.public_update_slot_status(text, text, text);
drop function if exists public.public_delete_slot(text, text);
drop function if exists public.public_upsert_branch(text, text, text, text, text, boolean, text);
drop function if exists public.public_delete_branch(text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text);
drop function if exists public.public_update_instructor_active(text, boolean, text);

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

  update public.slots
    set status = 'available',
        booking_id = null,
        updated_at = now()
    where id = v_booking.slot_id;

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

  if p_duration < 30 or p_duration > 240 then
    raise exception 'Slot duration is invalid.';
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

  insert into public.slots (
    id, school_id, branch_id, instructor_id, date, time, duration, status
  ) values (
    p_slot_id, p_school_id, p_branch_id, p_instructor_id, v_slot_date, v_slot_time, p_duration, 'available'
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

alter table public.staff_access_credentials enable row level security;

grant usage on schema public to anon, authenticated;
grant execute on function public.public_cancel_booking(text, text) to anon, authenticated;
grant execute on function public.public_complete_booking(text, text) to anon, authenticated;
grant execute on function public.public_reschedule_booking(text, text, text) to anon, authenticated;
grant execute on function public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text) to anon, authenticated;
grant execute on function public.public_create_slot(text, text, text, text, text, text, integer, text) to anon, authenticated;
grant execute on function public.public_update_slot_status(text, text, text) to anon, authenticated;
grant execute on function public.public_delete_slot(text, text) to anon, authenticated;
grant execute on function public.public_upsert_branch(text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.public_delete_branch(text, text) to anon, authenticated;
grant execute on function public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text) to anon, authenticated;
grant execute on function public.public_update_instructor_active(text, boolean, text) to anon, authenticated;

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
drop function if exists public.public_reschedule_booking(text, text);
drop function if exists public.public_reschedule_booking(text, text, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text);
drop function if exists public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer);
drop function if exists public.public_create_slot(text, text, text, text, text, text, integer, text);
drop function if exists public.public_update_slot_status(text, text);
drop function if exists public.public_update_slot_status(text, text, text);
drop function if exists public.public_delete_slot(text);
drop function if exists public.public_delete_slot(text, text);
drop function if exists public.public_upsert_branch(text, text, text, text, text, boolean, text);
drop function if exists public.public_delete_branch(text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text);
drop function if exists public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text);
drop function if exists public.public_update_instructor_active(text, boolean, text);
drop function if exists public.public_update_student_profile(text, text, text, text, text, text);
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
  ('superadmin', 'ddc85ebe831f77142817db5a756d377c954b92c87c0c1e5fa4746a872b7f6588');

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
    or encode(digest(coalesce(p_staff_password, ''), 'sha256'), 'hex') <> v_expected then
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
  status text not null default 'active' check (status in ('active', 'cancelled', 'completed')),
  notes text,
  comment text,
  rescheduled_at timestamptz,
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

  select max_slots_per_booking
    into v_max_slots
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
    join unnest(p_slot_ids) as selected(slot_id) on selected.slot_id = s.id
    where s.school_id = p_school_id
    order by s.date, s.time
    for update
  loop
    if v_slot.status <> 'available' then
      raise exception 'Один из выбранных слотов уже занят.';
    end if;

    v_booking_id := 'booking-' || replace(gen_random_uuid()::text, '-', '');

    insert into public.bookings (
      id, booking_group_id, school_id, slot_id, instructor_id, branch_id,
      student_id, student_name, student_phone, student_email, status
    ) values (
      v_booking_id, v_group_id, p_school_id, v_slot.id, v_slot.instructor_id, v_slot.branch_id,
      v_student_id, trim(p_student_name), v_normalized_phone, '', 'active'
    );

    update public.slots
      set status = 'booked',
          booking_id = v_booking_id,
          updated_at = now()
      where id = v_slot.id;

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

  update public.slots
    set status = 'available',
        booking_id = null,
        updated_at = now()
    where id = v_booking.slot_id;

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

  if p_duration < 30 or p_duration > 240 then
    raise exception 'Slot duration is invalid.';
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

  insert into public.slots (
    id, school_id, branch_id, instructor_id, date, time, duration, status
  ) values (
    p_slot_id, p_school_id, p_branch_id, p_instructor_id, v_slot_date, v_slot_time, p_duration, 'available'
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
  p_avatar_url text
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

  if not exists (
    select 1 from public.students
    where school_id = p_school_id
      and normalized_phone = v_normalized_phone
      and password_hash is not null
  ) and (p_password is null or length(p_password) < 6) then
    raise exception 'Password is too short.';
  end if;

  insert into public.students (
    id, school_id, name, phone, normalized_phone, email, password_hash, avatar_url
  ) values (
    'stu-' || replace(gen_random_uuid()::text, '-', ''),
    p_school_id,
    trim(p_name),
    v_normalized_phone,
    v_normalized_phone,
    coalesce(trim(p_email), ''),
    case when p_password is not null and length(p_password) >= 6 then extensions.crypt(p_password, extensions.gen_salt('bf')) else null end,
    nullif(trim(coalesce(p_avatar_url, '')), '')
  )
  on conflict (school_id, normalized_phone)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    password_hash = coalesce(excluded.password_hash, public.students.password_hash),
    avatar_url = excluded.avatar_url,
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

alter table public.schools enable row level security;
alter table public.staff_access_credentials enable row level security;
alter table public.branches enable row level security;
alter table public.instructors enable row level security;
alter table public.students enable row level security;
alter table public.slots enable row level security;
alter table public.booking_groups enable row level security;
alter table public.bookings enable row level security;
alter table public.slot_locks enable row level security;

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

create policy "Public can read bookings"
  on public.bookings for select
  using (true);

grant usage on schema public to anon, authenticated;
grant select on public.schools to anon, authenticated;
grant select on public.branches to anon, authenticated;
grant select on public.instructors to anon, authenticated;
grant select on public.slots to anon, authenticated;
grant select on public.bookings to anon, authenticated;
grant execute on function public.public_create_booking(text, text, text, text[]) to anon, authenticated;
grant execute on function public.public_cancel_booking(text, text) to anon, authenticated;
grant execute on function public.public_complete_booking(text, text) to anon, authenticated;
grant execute on function public.public_reschedule_booking(text, text, text) to anon, authenticated;
grant execute on function public.public_update_school_settings(text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], text) to anon, authenticated;
grant execute on function public.public_create_slot(text, text, text, text, text, text, integer, text) to anon, authenticated;
grant execute on function public.public_update_slot_status(text, text, text) to anon, authenticated;
grant execute on function public.public_delete_slot(text, text) to anon, authenticated;
grant execute on function public.public_upsert_branch(text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.public_delete_branch(text, text) to anon, authenticated;
grant execute on function public.public_upsert_instructor(text, text, text, text, text, text, text, text, boolean, text, text, text[], text) to anon, authenticated;
grant execute on function public.public_update_instructor_active(text, boolean, text) to anon, authenticated;
grant execute on function public.public_update_student_profile(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_login_student(text, text, text) to anon, authenticated;
grant execute on function public.public_request_branch_change(text, text, text) to anon, authenticated;
