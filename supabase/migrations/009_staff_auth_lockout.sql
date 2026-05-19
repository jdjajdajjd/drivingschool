create table if not exists public.staff_auth_attempts (
  role text not null,
  login text not null,
  failed_count integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (role, login)
);

create index if not exists staff_auth_attempts_locked_until_idx
  on public.staff_auth_attempts(locked_until);

alter table public.staff_auth_attempts enable row level security;

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
        case when coalesce(cardinality(branch_credentials.branch_ids), 0) = 0 then 'admin' else 'branch_admin' end,
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
