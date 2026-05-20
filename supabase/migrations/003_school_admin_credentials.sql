create extension if not exists "pgcrypto";

create table if not exists public.staff_branch_credentials (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  login text not null unique,
  password_sha256 text not null,
  branch_ids text[] not null default '{}',
  staff_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_branch_credentials_school_idx on public.staff_branch_credentials(school_id);

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

create or replace function public.private_assert_staff_school_scope(
  p_staff_secret text,
  p_school_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_context record;
begin
  select *
    into v_context
    from public.private_staff_context(p_staff_secret)
    where staff_role in ('admin', 'branch_admin')
    limit 1;

  if v_context.staff_role is null then
    raise exception 'Staff access denied.';
  end if;

  if v_context.school_id is not null and v_context.school_id <> '' and v_context.school_id <> p_school_id then
    raise exception 'School access denied.';
  end if;
end;
$$;

create or replace function public.private_assert_admin_or_branch_scope(
  p_staff_secret text,
  p_branch_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_context record;
  v_branch_school_id text;
begin
  select *
    into v_context
    from public.private_staff_context(p_staff_secret)
    where staff_role in ('admin', 'branch_admin')
    limit 1;

  if v_context.staff_role is null then
    raise exception 'Staff access denied.';
  end if;

  if p_branch_id is not null and p_branch_id <> '' then
    select school_id into v_branch_school_id from public.branches where id = p_branch_id;
  end if;

  if v_context.staff_role = 'admin' then
    if v_context.school_id is not null and v_context.school_id <> '' and v_branch_school_id is not null and v_branch_school_id <> v_context.school_id then
      raise exception 'School access denied.';
    end if;
    return;
  end if;

  if p_branch_id is null or p_branch_id = '' or not (p_branch_id = any(coalesce(v_context.branch_ids, '{}'))) then
    raise exception 'Branch access denied.';
  end if;

  if v_context.school_id is not null and v_context.school_id <> '' and v_branch_school_id <> v_context.school_id then
    raise exception 'School access denied.';
  end if;
end;
$$;

create or replace function public.public_upsert_school_staff_credential(
  p_school_id text,
  p_login text,
  p_password text,
  p_staff_name text,
  p_is_active boolean,
  p_superadmin_password text
)
returns table (login text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  if p_school_id is null or not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;

  if p_login is null or length(trim(p_login)) < 3 then
    raise exception 'School admin login is required.';
  end if;

  if p_password is null or length(trim(p_password)) < 8 then
    raise exception 'School admin password must contain at least 8 characters.';
  end if;

  insert into public.staff_branch_credentials (
    school_id, login, password_sha256, branch_ids, staff_name, is_active, updated_at
  ) values (
    p_school_id,
    lower(trim(p_login)),
    encode(extensions.digest(trim(p_password), 'sha256'), 'hex'),
    '{}',
    coalesce(nullif(trim(p_staff_name), ''), trim(p_login)),
    coalesce(p_is_active, true),
    now()
  )
  on conflict on constraint staff_branch_credentials_login_key
  do update set
    school_id = excluded.school_id,
    password_sha256 = excluded.password_sha256,
    branch_ids = '{}',
    staff_name = excluded.staff_name,
    is_active = excluded.is_active,
    updated_at = now();

  return query select lower(trim(p_login));
end;
$$;

create or replace function public.public_open_staff_session(
  p_role text,
  p_login text,
  p_password text
)
returns table (
  role text,
  session_token text,
  expires_at timestamptz,
  school_id text,
  branch_ids text[],
  staff_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_school_id text;
  v_branch_ids text[];
  v_staff_name text;
  v_token text;
  v_expires_at timestamptz;
begin
  if p_role not in ('admin', 'superadmin') then
    raise exception 'Staff role is invalid.';
  end if;

  select credentials.role, credentials.school_id, coalesce(credentials.branch_ids, '{}'), credentials.staff_name
    into v_role, v_school_id, v_branch_ids, v_staff_name
    from public.staff_access_credentials credentials
    where credentials.role = p_role
      and lower(trim(coalesce(p_login, ''))) = lower(trim(coalesce(credentials.login, '')))
      and encode(extensions.digest(trim(coalesce(p_password, '')), 'sha256'), 'hex') = credentials.password_sha256
    limit 1;

  if v_role is null and p_role = 'admin' then
    select
        case when coalesce(cardinality(branch_credentials.branch_ids), 0) = 0 then 'admin' else 'branch_admin' end,
        branch_credentials.school_id,
        coalesce(branch_credentials.branch_ids, '{}'),
        branch_credentials.staff_name
      into v_role, v_school_id, v_branch_ids, v_staff_name
      from public.staff_branch_credentials branch_credentials
      where branch_credentials.is_active = true
        and lower(trim(coalesce(p_login, ''))) = lower(trim(branch_credentials.login))
        and encode(extensions.digest(trim(coalesce(p_password, '')), 'sha256'), 'hex') = branch_credentials.password_sha256
      limit 1;
  end if;

  if v_role is null then
    raise exception 'Staff access denied.';
  end if;

  delete from public.staff_access_sessions sessions
  where sessions.expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '12 hours';

  insert into public.staff_access_sessions (role, token_sha256, expires_at, school_id, branch_ids, staff_name)
  values (
    v_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expires_at,
    v_school_id,
    coalesce(v_branch_ids, '{}'),
    coalesce(v_staff_name, '')
  );

  role := v_role;
  session_token := v_token;
  expires_at := v_expires_at;
  school_id := v_school_id;
  branch_ids := coalesce(v_branch_ids, '{}');
  staff_name := coalesce(v_staff_name, '');
  return next;
end;
$$;

create or replace function public.public_admin_list_bookings(p_school_id text, p_staff_password text)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_context record;
begin
  perform public.private_assert_staff_school_scope(p_staff_password, p_school_id);

  select *
    into v_context
    from public.private_staff_context(p_staff_password)
    where staff_role in ('admin', 'branch_admin')
    limit 1;

  return query
    select *
    from public.bookings
    where school_id = p_school_id
      and (
        v_context.staff_role = 'admin'
        or branch_id = any(coalesce(v_context.branch_ids, '{}'))
      )
    order by created_at desc;
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
declare
  v_context record;
begin
  perform public.private_assert_staff_school_scope(p_staff_password, p_school_id);

  select *
    into v_context
    from public.private_staff_context(p_staff_password)
    where staff_role in ('admin', 'branch_admin')
    limit 1;

  return query
    select *
    from public.students
    where school_id = p_school_id
      and (
        v_context.staff_role = 'admin'
        or assigned_branch_id = any(coalesce(v_context.branch_ids, '{}'))
        or public.private_student_branch_id(id) = any(coalesce(v_context.branch_ids, '{}'))
      )
    order by created_at desc;
end;
$$;

create or replace function public.public_admin_list_records(
  p_school_id text,
  p_staff_password text
)
returns table (
  id text,
  school_id text,
  kind text,
  branch_id text,
  student_id text,
  payload jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_context record;
begin
  perform public.private_assert_staff_school_scope(p_staff_password, p_school_id);

  select *
    into v_context
    from public.private_staff_context(p_staff_password)
    where staff_role in ('admin', 'branch_admin')
    limit 1;

  return query
    select
      admin_records.id,
      admin_records.school_id,
      admin_records.kind,
      admin_records.branch_id,
      admin_records.student_id,
      admin_records.payload,
      admin_records.updated_at
    from public.admin_records
    where admin_records.school_id = p_school_id
      and (
        v_context.staff_role = 'admin'
        or admin_records.branch_id = any(coalesce(v_context.branch_ids, '{}'))
        or public.private_student_branch_id(admin_records.student_id) = any(coalesce(v_context.branch_ids, '{}'))
      )
    order by admin_records.updated_at desc;
end;
$$;

grant execute on function public.public_upsert_school_staff_credential(text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.private_assert_staff_school_scope(text, text) to anon, authenticated;

create or replace function public.public_create_school(
  p_school_id text,
  p_name text,
  p_slug text,
  p_description text,
  p_phone text,
  p_email text,
  p_address text,
  p_primary_color text,
  p_logo_url text,
  p_booking_limit_enabled boolean,
  p_max_active_bookings_per_student integer,
  p_branch_selection_mode text,
  p_max_slots_per_booking integer,
  p_default_lesson_duration integer,
  p_enabled_category_codes text[],
  p_is_active boolean,
  p_superadmin_password text
)
returns setof public.schools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id text;
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  if p_school_id is null or length(trim(p_school_id)) = 0 then
    raise exception 'School id is required.';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'School name is required.';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9-]+$' then
    raise exception 'School slug is invalid.';
  end if;

  if exists (select 1 from public.schools where slug = p_slug) then
    raise exception 'School slug already exists.';
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
    raise exception 'Slots per booking limit is invalid.';
  end if;

  if p_default_lesson_duration < 30 or p_default_lesson_duration > 240 or p_default_lesson_duration % 15 <> 0 then
    raise exception 'Default lesson duration is invalid.';
  end if;

  v_school_id := trim(p_school_id);

  insert into public.schools (
    id,
    name,
    slug,
    description,
    phone,
    email,
    address,
    primary_color,
    logo_url,
    booking_limit_enabled,
    max_active_bookings_per_student,
    branch_selection_mode,
    max_slots_per_booking,
    default_lesson_duration,
    enabled_category_codes,
    is_active,
    created_at,
    updated_at
  ) values (
    v_school_id,
    trim(p_name),
    trim(p_slug),
    coalesce(trim(p_description), ''),
    coalesce(trim(p_phone), ''),
    coalesce(trim(p_email), ''),
    coalesce(trim(p_address), ''),
    nullif(trim(coalesce(p_primary_color, '')), ''),
    nullif(trim(coalesce(p_logo_url, '')), ''),
    coalesce(p_booking_limit_enabled, true),
    p_max_active_bookings_per_student,
    p_branch_selection_mode,
    p_max_slots_per_booking,
    p_default_lesson_duration,
    coalesce(p_enabled_category_codes, array['B']),
    coalesce(p_is_active, true),
    now(),
    now()
  );

  return query select * from public.schools where id = v_school_id;
end;
$$;

grant execute on function public.public_create_school(text, text, text, text, text, text, text, text, text, boolean, integer, text, integer, integer, text[], boolean, text) to anon, authenticated;

create or replace function public.public_superadmin_update_school_access(
  p_school_id text,
  p_access_status text,
  p_access_paid_until date,
  p_access_last_paid_at date,
  p_access_last_amount integer,
  p_access_payment_note text,
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

  update public.schools
    set access_status = p_access_status,
        access_paid_until = p_access_paid_until,
        access_last_paid_at = p_access_last_paid_at,
        access_last_amount = p_access_last_amount,
        access_payment_note = coalesce(p_access_payment_note, ''),
        is_active = p_access_status <> 'blocked',
        updated_at = now()
    where id = p_school_id;

  if not found then
    raise exception 'School not found.';
  end if;

  return query select * from public.schools where id = p_school_id;
end;
$$;

grant execute on function public.public_superadmin_update_school_access(text, text, date, date, integer, text, text) to anon, authenticated;



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
