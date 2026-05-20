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
  v_school record;
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

  select max_slots_per_booking, booking_limit_enabled, max_active_bookings_per_student, is_active, access_status, access_paid_until
    into v_school
    from public.schools
    where id = p_school_id;

  if v_school is null then
    raise exception 'Автошкола не найдена.';
  end if;

  if v_school.is_active is not true or v_school.access_status in ('blocked', 'overdue') or (v_school.access_paid_until is not null and v_school.access_paid_until < current_date) then
    raise exception 'Запись закрыта: у автошколы нет активного доступа.';
  end if;

  v_max_slots := coalesce(v_school.max_slots_per_booking, 1);
  v_booking_limit_enabled := coalesce(v_school.booking_limit_enabled, true);
  v_max_active_bookings := coalesce(v_school.max_active_bookings_per_student, 0);

  select count(distinct selected_slot_id)
    into v_slot_count
    from unnest(p_slot_ids) as selected_slot_id;

  if v_slot_count = 0 then
    raise exception 'Выберите время занятия.';
  end if;

  if v_slot_count > v_max_slots then
    raise exception 'Выбрано слишком много занятий.';
  end if;

  if v_booking_limit_enabled and v_max_active_bookings > 0 then
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

    if (v_slot.date::timestamp + v_slot.time) < now() then
      raise exception 'Нельзя записаться на прошедшее время.';
    end if;

    if exists (
      select 1
      from public.bookings b
      join public.slots s on s.id = b.slot_id
      where b.school_id = p_school_id
        and b.student_id = v_student_id
        and b.status = 'active'
        and s.date = v_slot.date
        and s.id <> v_slot.id
        and (extract(hour from s.time)::int * 60 + extract(minute from s.time)::int) < (extract(hour from v_slot.time)::int * 60 + extract(minute from v_slot.time)::int + v_slot.duration)
        and (extract(hour from v_slot.time)::int * 60 + extract(minute from v_slot.time)::int) < (extract(hour from s.time)::int * 60 + extract(minute from s.time)::int + s.duration)
    ) then
      raise exception 'У ученика уже есть занятие в это время.';
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

grant execute on function public.public_create_booking(text, text, text, text[]) to anon, authenticated;
