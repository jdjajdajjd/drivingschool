-- Launch hardening: resource conflicts and real role-aware admin reads.

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
    where staff_role in ('director', 'admin', 'branch_admin', 'accountant', 'instructor')
    limit 1;

  return query
    select *
    from public.bookings
    where school_id = p_school_id
      and (
        v_context.staff_role in ('director', 'admin', 'accountant')
        or branch_id = any(coalesce(v_context.branch_ids, '{}'))
        or instructor_id in (
          select instructors.id
          from public.instructors
          where instructors.school_id = p_school_id
            and instructors.branch_id = any(coalesce(v_context.branch_ids, '{}'))
        )
      )
    order by created_at desc;
end;
$$;

create or replace function public.public_admin_list_students(p_school_id text, p_staff_password text)
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
    where staff_role in ('director', 'admin', 'branch_admin', 'accountant', 'instructor')
    limit 1;

  return query
    select *
    from public.students
    where school_id = p_school_id
      and (
        v_context.staff_role in ('director', 'admin', 'accountant')
        or assigned_branch_id = any(coalesce(v_context.branch_ids, '{}'))
        or public.private_student_branch_id(id) = any(coalesce(v_context.branch_ids, '{}'))
      )
    order by created_at desc;
end;
$$;

create or replace function public.public_admin_list_records(p_school_id text, p_staff_password text)
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
    where staff_role in ('director', 'admin', 'branch_admin', 'accountant', 'instructor')
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
        v_context.staff_role in ('director', 'admin', 'accountant')
        or admin_records.branch_id = any(coalesce(v_context.branch_ids, '{}'))
        or admin_records.student_id in (
          select students.id
          from public.students
          where students.school_id = p_school_id
            and (
              students.assigned_branch_id = any(coalesce(v_context.branch_ids, '{}'))
              or public.private_student_branch_id(students.id) = any(coalesce(v_context.branch_ids, '{}'))
            )
        )
      )
    order by admin_records.updated_at desc;
end;
$$;

create or replace function public.private_slot_minutes(p_time time)
returns integer
language sql
immutable
as $$
  select extract(hour from p_time)::int * 60 + extract(minute from p_time)::int;
$$;

create or replace function public.private_slot_ranges_overlap(p_left_start time, p_left_duration integer, p_right_start time, p_right_duration integer)
returns boolean
language sql
immutable
as $$
  select public.private_slot_minutes(p_left_start) < public.private_slot_minutes(p_right_start) + p_right_duration
     and public.private_slot_minutes(p_right_start) < public.private_slot_minutes(p_left_start) + p_left_duration;
$$;

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
  v_target_car text;
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
  do update set name = excluded.name, phone = excluded.phone, updated_at = now()
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

    select lower(nullif(trim(i.car), '')) into v_target_car from public.instructors i where i.id = v_slot.instructor_id;

    if exists (
      select 1
      from public.bookings b
      join public.slots s on s.id = b.slot_id
      left join public.instructors i on i.id = s.instructor_id
      where b.school_id = p_school_id
        and b.status = 'active'
        and s.date = v_slot.date
        and s.id <> v_slot.id
        and public.private_slot_ranges_overlap(s.time, s.duration, v_slot.time, v_slot.duration)
        and (
          b.student_id = v_student_id
          or b.student_phone = v_normalized_phone
          or s.instructor_id = v_slot.instructor_id
          or (v_target_car is not null and lower(nullif(trim(i.car), '')) = v_target_car)
        )
    ) then
      raise exception 'На это время уже есть конфликт по ученику, инструктору или машине.';
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
    insert into public.bookings (id, booking_group_id, school_id, slot_id, instructor_id, branch_id, student_id, student_name, student_phone, student_email, status)
    values (v_booking_id, v_group_id, p_school_id, v_slot.id, v_slot.instructor_id, v_slot.branch_id, v_student_id, trim(p_student_name), v_normalized_phone, '', 'active');

    update public.slots as target_slot
      set status = 'booked', booking_id = v_booking_id, updated_at = now()
      where target_slot.id = v_slot.id and target_slot.status = 'available' and target_slot.booking_id is null;

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
  v_target_car text;
begin
  perform public.private_assert_admin_password(p_staff_password);

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;
  if v_booking.status <> 'active' then raise exception 'Only active bookings can be rescheduled.'; end if;

  select * into v_next_slot from public.slots where id = p_new_slot_id for update;
  if not found then raise exception 'New slot not found.'; end if;
  if v_next_slot.status <> 'available' then raise exception 'New slot is already booked.'; end if;
  if v_next_slot.date < current_date then raise exception 'New slot is in the past.'; end if;

  if not exists (
    select 1
    from public.schools s
    join public.branches b on b.id = v_next_slot.branch_id
    join public.instructors i on i.id = v_next_slot.instructor_id
    where s.id = v_booking.school_id
      and v_next_slot.school_id = v_booking.school_id
      and b.school_id = v_booking.school_id
      and i.school_id = v_booking.school_id
      and i.branch_id = v_next_slot.branch_id
      and s.is_active = true
      and b.is_active = true
      and i.is_active = true
  ) then
    raise exception 'New slot is no longer available.';
  end if;

  select lower(nullif(trim(i.car), '')) into v_target_car from public.instructors i where i.id = v_next_slot.instructor_id;

  if exists (
    select 1
    from public.bookings b
    join public.slots s on s.id = b.slot_id
    left join public.instructors i on i.id = s.instructor_id
    where b.school_id = v_booking.school_id
      and b.id <> v_booking.id
      and b.status = 'active'
      and s.date = v_next_slot.date
      and public.private_slot_ranges_overlap(s.time, s.duration, v_next_slot.time, v_next_slot.duration)
      and (
        b.student_id = v_booking.student_id
        or b.student_phone = v_booking.student_phone
        or s.instructor_id = v_next_slot.instructor_id
        or (v_target_car is not null and lower(nullif(trim(i.car), '')) = v_target_car)
      )
  ) then
    raise exception 'Новое время конфликтует по ученику, инструктору или машине.';
  end if;

  update public.slots set status = 'available', booking_id = null, updated_at = now() where id = v_booking.slot_id and booking_id = p_booking_id;
  update public.bookings set slot_id = v_next_slot.id, branch_id = v_next_slot.branch_id, instructor_id = v_next_slot.instructor_id, rescheduled_at = now(), updated_at = now() where id = p_booking_id;
  update public.slots set status = 'booked', booking_id = p_booking_id, updated_at = now() where id = v_next_slot.id;

  booking_id := p_booking_id;
  previous_slot_id := v_booking.slot_id;
  new_slot_id := v_next_slot.id;
  return next;
end;
$$;

grant execute on function public.public_admin_list_bookings(text, text) to anon, authenticated;
grant execute on function public.public_admin_list_students(text, text) to anon, authenticated;
grant execute on function public.public_admin_list_records(text, text) to anon, authenticated;
grant execute on function public.public_create_booking(text, text, text, text[]) to anon, authenticated;
grant execute on function public.public_reschedule_booking(text, text, text) to anon, authenticated;


create or replace function public.public_create_slot(
  p_slot_id text,
  p_school_id text,
  p_branch_id text,
  p_instructor_id text,
  p_date text,
  p_start_time text,
  p_duration integer,
  p_lesson_type text,
  p_staff_password text
)
returns table (slot_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_date date;
  v_slot_time time;
  v_target_car text;
begin
  perform public.private_assert_admin_password(p_staff_password);

  v_slot_date := p_date::date;
  v_slot_time := p_start_time::time;

  if v_slot_date < current_date then raise exception 'Slot date is in the past.'; end if;
  if p_duration < 30 or p_duration > 240 or p_duration % 15 <> 0 then raise exception 'Slot duration is invalid.'; end if;
  if p_lesson_type not in ('driving', 'main', 'extra', 'practice_ground', 'city', 'exam_route', 'internal_exam', 'retake', 'mistakes') then raise exception 'Slot lesson type is invalid.'; end if;

  if not exists (select 1 from public.branches where id = p_branch_id and school_id = p_school_id and is_active = true) then
    raise exception 'Branch is not available.';
  end if;

  if not exists (select 1 from public.instructors where id = p_instructor_id and school_id = p_school_id and branch_id = p_branch_id and is_active = true) then
    raise exception 'Instructor is not available for this branch.';
  end if;

  select lower(nullif(trim(car), '')) into v_target_car from public.instructors where id = p_instructor_id;

  if exists (
    select 1
    from public.slots s
    where s.school_id = p_school_id
      and s.instructor_id = p_instructor_id
      and s.date = v_slot_date
      and s.status <> 'cancelled'
      and public.private_slot_ranges_overlap(s.time, s.duration, v_slot_time, p_duration)
  ) then
    raise exception 'Slot overlaps existing instructor time.';
  end if;

  if v_target_car is not null and exists (
    select 1
    from public.slots s
    join public.instructors i on i.id = s.instructor_id
    where s.school_id = p_school_id
      and s.instructor_id <> p_instructor_id
      and s.date = v_slot_date
      and s.status <> 'cancelled'
      and lower(nullif(trim(i.car), '')) = v_target_car
      and public.private_slot_ranges_overlap(s.time, s.duration, v_slot_time, p_duration)
  ) then
    raise exception 'Car overlaps existing slot time.';
  end if;

  insert into public.slots (id, school_id, branch_id, instructor_id, date, time, duration, lesson_type, status)
  values (p_slot_id, p_school_id, p_branch_id, p_instructor_id, v_slot_date, v_slot_time, p_duration, p_lesson_type, 'available');

  slot_id := p_slot_id;
  return next;
exception
  when unique_violation then raise exception 'Slot already exists.';
end;
$$;

grant execute on function public.public_create_slot(text, text, text, text, text, text, integer, text, text) to anon, authenticated;
