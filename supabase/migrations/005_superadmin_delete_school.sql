create or replace function public.public_delete_school(
  p_school_id text,
  p_superadmin_password text
)
returns table (school_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school public.schools%rowtype;
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  select * into v_school
    from public.schools
    where id = p_school_id;

  if v_school.id is null then
    raise exception 'School not found.';
  end if;

  if v_school.id = 'school-virazh' or v_school.slug = 'virazh' then
    raise exception 'Virazh cannot be deleted.';
  end if;

  delete from public.schools where id = v_school.id;

  return query select v_school.id;
end;
$$;

grant execute on function public.public_delete_school(text, text) to anon, authenticated;

create or replace function public.public_superadmin_list_schools(
  p_superadmin_password text
)
returns setof public.schools
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.private_assert_staff_secret('superadmin', p_superadmin_password);

  return query
    select *
    from public.schools
    order by name asc;
end;
$$;

grant execute on function public.public_superadmin_list_schools(text) to anon, authenticated;
