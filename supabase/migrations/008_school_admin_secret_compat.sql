create or replace function public.private_assert_admin_password(p_staff_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret_hash text;
begin
  v_secret_hash := encode(extensions.digest(coalesce(p_staff_password, ''), 'sha256'), 'hex');

  if exists (
    select 1
    from public.staff_access_credentials credentials
    where credentials.role = 'admin'
      and credentials.password_sha256 = v_secret_hash
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.staff_branch_credentials credentials
    where credentials.is_active = true
      and coalesce(cardinality(credentials.branch_ids), 0) = 0
      and credentials.password_sha256 = v_secret_hash
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.staff_access_sessions sessions
    where sessions.role = 'admin'
      and sessions.expires_at > now()
      and coalesce(cardinality(sessions.branch_ids), 0) = 0
      and sessions.token_sha256 = v_secret_hash
  ) then
    return;
  end if;

  raise exception 'Admin access denied.';
end;
$$;
