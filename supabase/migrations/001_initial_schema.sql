create extension if not exists "pgcrypto";

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  logo_url text,
  primary_color text default '#4455C4',
  booking_limit_enabled boolean not null default true,
  max_active_bookings_per_student integer not null default 2,
  branch_selection_mode text not null default 'student_choice'
    check (branch_selection_mode in ('student_choice', 'fixed_first')),
  max_slots_per_booking integer not null default 1 check (max_slots_per_booking between 1 and 6),
  default_lesson_duration integer not null default 90 check (default_lesson_duration between 30 and 240),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  address text not null,
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  name text not null,
  phone text not null default '',
  email text not null default '',
  token text not null unique,
  bio text not null default '',
  experience integer not null default 0,
  is_active boolean not null default true,
  categories text[] not null default '{}',
  avatar_initials text not null default '',
  avatar_color text not null default '#4455C4',
  car text,
  transmission text check (transmission in ('manual', 'auto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  phone text not null,
  normalized_phone text not null,
  email text not null default '',
  assigned_branch_id uuid references public.branches(id) on delete set null,
  assigned_instructor_id uuid references public.instructors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, normalized_phone)
);

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  date date not null,
  time time not null,
  duration integer not null default 90 check (duration between 30 and 240),
  status text not null default 'available' check (status in ('available', 'booked', 'cancelled')),
  booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instructor_id, date, time)
);

create table if not exists public.booking_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'partially_cancelled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_group_id uuid references public.booking_groups(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete restrict,
  instructor_id uuid not null references public.instructors(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  student_name text not null,
  student_phone text not null,
  student_email text not null default '',
  status text not null default 'active' check (status in ('active', 'cancelled', 'completed')),
  notes text,
  comment text,
  rescheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.slots
    add constraint slots_booking_id_fkey
    foreign key (booking_id) references public.bookings(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists branches_school_id_idx on public.branches(school_id);
create index if not exists instructors_school_id_idx on public.instructors(school_id);
create index if not exists instructors_branch_id_idx on public.instructors(branch_id);
create index if not exists students_school_id_idx on public.students(school_id);
create index if not exists students_school_phone_idx on public.students(school_id, normalized_phone);
create index if not exists slots_school_date_idx on public.slots(school_id, date);
create index if not exists slots_instructor_date_idx on public.slots(instructor_id, date);
create index if not exists bookings_school_id_idx on public.bookings(school_id);
create index if not exists bookings_student_id_idx on public.bookings(student_id);

alter table public.schools enable row level security;
alter table public.branches enable row level security;
alter table public.instructors enable row level security;
alter table public.students enable row level security;
alter table public.slots enable row level security;
alter table public.booking_groups enable row level security;
alter table public.bookings enable row level security;

create policy "Public can read active schools"
  on public.schools for select
  using (is_active = true);

create policy "Public can read active branches"
  on public.branches for select
  using (is_active = true);

create policy "Public can read active instructors"
  on public.instructors for select
  using (is_active = true);

create policy "Public can read slots"
  on public.slots for select
  using (true);

create policy "Public can read bookings for occupied slot display"
  on public.bookings for select
  using (true);
