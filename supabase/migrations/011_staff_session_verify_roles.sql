-- Verify exact school staff roles created by public_open_staff_session.

create or replace function public.public_verify_staff_session(
  p_role text,
  p_session_token text
)
returns table (role text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('admin', 'superadmin', 'director', 'branch_admin', 'accountant', 'instructor') then
    raise exception 'Staff role is invalid.';
  end if;

  return query
    select sessions.role, sessions.expires_at
    from public.staff_access_sessions sessions
    where sessions.role = p_role
      and sessions.expires_at > now()
      and sessions.token_sha256 = encode(extensions.digest(coalesce(p_session_token, ''), 'sha256'), 'hex')
    limit 1;
end;
$$;

grant execute on function public.public_verify_staff_session(text, text) to anon, authenticated;
