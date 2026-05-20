-- Staff credentials with real school roles. Safe additive patch.

alter table public.staff_branch_credentials
  add column if not exists staff_role text not null default 'admin';

create index if not exists staff_branch_credentials_role_idx
  on public.staff_branch_credentials(school_id, staff_role, is_active);

do $$
begin
  alter table public.staff_branch_credentials drop constraint if exists staff_branch_credentials_staff_role_check;
  alter table public.staff_branch_credentials
    add constraint staff_branch_credentials_staff_role_check
    check (staff_role in ('director', 'admin', 'branch_admin', 'accountant', 'instructor'));
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
    where staff_role in ('director', 'admin', 'branch_admin', 'accountant', 'instructor')
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
    where staff_role in ('director', 'admin', 'branch_admin')
    limit 1;

  if v_context.staff_role is null then
    raise exception 'Staff access denied.';
  end if;

  if p_branch_id is not null and p_branch_id <> '' then
    select school_id into v_branch_school_id from public.branches where id = p_branch_id;
  end if;

  if v_context.staff_role in ('director', 'admin') then
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
  p_staff_secret text,
  p_staff_role text default 'admin',
  p_branch_ids text[] default '{}'
)
returns table (login text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor record;
  v_staff_role text;
  v_branch_ids text[];
  v_existing_hash text;
  v_password_hash text;
begin
  select *
    into v_actor
    from public.private_staff_context(p_staff_secret)
    where staff_role in ('superadmin', 'director', 'admin')
    limit 1;

  if v_actor.staff_role is null then
    raise exception 'Staff access denied.';
  end if;

  if v_actor.staff_role <> 'superadmin' and coalesce(v_actor.school_id, '') <> p_school_id then
    raise exception 'School access denied.';
  end if;

  if p_school_id is null or not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;

  if p_login is null or length(trim(p_login)) < 3 then
    raise exception 'Staff login is required.';
  end if;

  v_staff_role := coalesce(nullif(trim(p_staff_role), ''), 'admin');
  if v_staff_role not in ('director', 'admin', 'branch_admin', 'accountant', 'instructor') then
    raise exception 'Staff role is invalid.';
  end if;

  v_branch_ids := coalesce(p_branch_ids, '{}');
  if v_staff_role not in ('branch_admin', 'instructor') then
    v_branch_ids := '{}';
  elsif coalesce(cardinality(v_branch_ids), 0) = 0 then
    raise exception 'Branch scoped staff must have at least one branch.';
  elsif exists (
    select 1
    from unnest(v_branch_ids) branch_id
    left join public.branches branches on branches.id = branch_id and branches.school_id = p_school_id
    where branches.id is null
  ) then
    raise exception 'Branch access denied.';
  end if;

  select password_sha256
    into v_existing_hash
    from public.staff_branch_credentials
    where lower(trim(login)) = lower(trim(p_login))
    limit 1;

  if p_password is not null and length(trim(p_password)) > 0 then
    if length(trim(p_password)) < 8 then
      raise exception 'Staff password must contain at least 8 characters.';
    end if;
    v_password_hash := encode(extensions.digest(trim(p_password), 'sha256'), 'hex');
  elsif v_existing_hash is not null then
    v_password_hash := v_existing_hash;
  else
    raise exception 'Staff password must contain at least 8 characters.';
  end if;

  insert into public.staff_branch_credentials (
    school_id, login, password_sha256, branch_ids, staff_name, staff_role, is_active, updated_at
  ) values (
    p_school_id,
    lower(trim(p_login)),
    v_password_hash,
    v_branch_ids,
    coalesce(nullif(trim(p_staff_name), ''), trim(p_login)),
    v_staff_role,
    coalesce(p_is_active, true),
    now()
  )
  on conflict on constraint staff_branch_credentials_login_key
  do update set
    school_id = excluded.school_id,
    password_sha256 = excluded.password_sha256,
    branch_ids = excluded.branch_ids,
    staff_name = excluded.staff_name,
    staff_role = excluded.staff_role,
    is_active = excluded.is_active,
    updated_at = now();

  return query select lower(trim(p_login));
end;
$$;

grant execute on function public.public_upsert_school_staff_credential(text, text, text, text, boolean, text, text, text[]) to anon, authenticated;

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
  v_login text;
  v_locked_until timestamptz;
  v_failed_count integer;
begin
  if p_role not in ('admin', 'superadmin') then
    raise exception 'Staff role is invalid.';
  end if;

  v_login := lower(trim(coalesce(p_login, '')));

  delete from public.staff_auth_attempts attempts
  where attempts.locked_until is null
    and attempts.updated_at < now() - interval '24 hours';

  select attempts.locked_until
    into v_locked_until
    from public.staff_auth_attempts attempts
    where attempts.role = p_role
      and attempts.login = v_login;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'Too many login attempts. Try later.';
  end if;

  select credentials.role, credentials.school_id, coalesce(credentials.branch_ids, '{}'), credentials.staff_name
    into v_role, v_school_id, v_branch_ids, v_staff_name
    from public.staff_access_credentials credentials
    where credentials.role = p_role
      and lower(trim(coalesce(credentials.login, ''))) = v_login
      and encode(extensions.digest(trim(coalesce(p_password, '')), 'sha256'), 'hex') = credentials.password_sha256
    limit 1;

  if v_role is null and p_role = 'admin' then
    select
        coalesce(nullif(branch_credentials.staff_role, ''), case when coalesce(cardinality(branch_credentials.branch_ids), 0) = 0 then 'admin' else 'branch_admin' end),
        branch_credentials.school_id,
        coalesce(branch_credentials.branch_ids, '{}'),
        branch_credentials.staff_name
      into v_role, v_school_id, v_branch_ids, v_staff_name
      from public.staff_branch_credentials branch_credentials
      where branch_credentials.is_active = true
        and lower(trim(branch_credentials.login)) = v_login
        and encode(extensions.digest(trim(coalesce(p_password, '')), 'sha256'), 'hex') = branch_credentials.password_sha256
      limit 1;
  end if;

  if v_role is null then
    insert into public.staff_auth_attempts (role, login, failed_count, locked_until, last_failed_at, updated_at)
    values (p_role, v_login, 1, null, now(), now())
    on conflict (role, login)
    do update set
      failed_count = case
        when public.staff_auth_attempts.updated_at < now() - interval '30 minutes' then 1
        else public.staff_auth_attempts.failed_count + 1
      end,
      locked_until = case
        when (
          case
            when public.staff_auth_attempts.updated_at < now() - interval '30 minutes' then 1
            else public.staff_auth_attempts.failed_count + 1
          end
        ) >= 8 then now() + interval '30 minutes'
        else null
      end,
      last_failed_at = now(),
      updated_at = now()
    returning failed_count into v_failed_count;

    raise exception 'Staff access denied.';
  end if;

  delete from public.staff_auth_attempts attempts
  where attempts.role = p_role
    and attempts.login = v_login;

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

grant execute on function public.public_open_staff_session(text, text, text) to anon, authenticated;
