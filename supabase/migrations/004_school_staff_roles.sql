-- Safe additive schema for multi-user school teams.
-- This file only creates missing structures and does not publish or connect anywhere.

create table if not exists public.school_role_definitions (
  id text primary key,
  label text not null,
  description text not null default '',
  permissions text[] not null default '{}',
  branch_scoped boolean not null default false,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_staff_members (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id) on delete cascade,
  role_id text not null references public.school_role_definitions(id),
  name text not null,
  phone text not null default '',
  email text,
  branch_ids text[] not null default '{}',
  is_active boolean not null default true,
  invited_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_staff_members_school_idx on public.school_staff_members(school_id);
create index if not exists school_staff_members_role_idx on public.school_staff_members(role_id);
create index if not exists school_staff_members_active_idx on public.school_staff_members(school_id, is_active);

insert into public.school_role_definitions (id, label, description, permissions, branch_scoped)
values
  ('director', 'Директор', 'Полный доступ к школе, финансам, настройкам и команде.', array['school.manage','branches.manage','staff.manage','students.manage','schedule.manage','finance.view','finance.manage','vehicles.manage','documents.manage','exams.manage','reports.view','settings.manage','data.delete'], false),
  ('admin', 'Менеджер школы', 'Операционная работа со всеми филиалами без удаления критичных данных.', array['branches.manage','students.manage','schedule.manage','vehicles.manage','documents.manage','exams.manage','reports.view'], false),
  ('branch_admin', 'Администратор филиала', 'Работа только с назначенными филиалами, учениками и расписанием.', array['students.manage','schedule.manage'], true),
  ('accountant', 'Бухгалтер', 'Просмотр и управление оплатами школы.', array['finance.view','finance.manage','reports.view'], false),
  ('instructor', 'Инструктор', 'Доступ к своему расписанию и ученикам без настроек школы.', array['schedule.manage'], true)
on conflict (id)
do update set
  label = excluded.label,
  description = excluded.description,
  permissions = excluded.permissions,
  branch_scoped = excluded.branch_scoped,
  updated_at = now();
