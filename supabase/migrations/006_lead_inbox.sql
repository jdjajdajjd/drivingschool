create or replace function public.public_superadmin_list_leads(
  p_superadmin_password text
)
returns setof public.lead_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  return query
    select *
    from public.lead_requests
    order by created_at desc
    limit 200;
end;
$$;

grant execute on function public.public_superadmin_list_leads(text) to anon, authenticated;

create or replace function public.public_superadmin_update_lead_status(
  p_lead_id uuid,
  p_status text,
  p_superadmin_password text
)
returns setof public.lead_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  if p_status not in ('new', 'contacted', 'qualified', 'won', 'lost') then
    raise exception 'Unsupported lead status.';
  end if;

  update public.lead_requests
    set status = p_status
    where id = p_lead_id;

  if not found then
    raise exception 'Lead not found.';
  end if;

  return query
    select *
    from public.lead_requests
    where id = p_lead_id;
end;
$$;

grant execute on function public.public_superadmin_update_lead_status(uuid, text, text) to anon, authenticated;
