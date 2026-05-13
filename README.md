# Vroom

Vroom is a React + Supabase product for driving schools. The current focus is not a marketing landing page, but a working product panel: student booking, school admin panel, operator panel, schedule, profiles, and launch settings.

## Current Entrances

- Product hub: `/`
- Student cabinet: `/student`
- Student registration: `/student/register`
- Public school page: `/school/virazh`
- Public school booking redirect: `/school/virazh/book`
- Booking confirmation: `/booking/<bookingId>`
- School staff login: `/staff-entrance-73q`
- School admin panel after login: `/virazh-office-73q`
- Super-admin login: `/root-entrance-91x`
- Super-admin panel after login: `/drivedesk-root-91x`
- Instructor public schedule: `/instructor/tok-petrov-2024`

School and platform access credentials must be provided through Vite environment variables. The app does not ship production fallback passwords.

## Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Supabase/Postgres
- Cloudflare Pages

## Local Run

```bash
npm install
npm run dev
```

Before shipping:

```bash
npm run typecheck
npm run build
npm run smoke:vroom
```

The smoke command checks production by default. To smoke another deployment, set `SMOKE_BASE_URL`, for example `SMOKE_BASE_URL=http://localhost:4173 npm run smoke:vroom`.

## Environment

Frontend variables:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_LOGIN=...
VITE_ADMIN_PASSWORD=...
VITE_SUPERADMIN_LOGIN=...
VITE_SUPERADMIN_PASSWORD=...
```

For applying SQL from the terminal:

```bash
SUPABASE_DATABASE_URL=postgresql://...
npm run supabase:apply
```

If direct database DNS is unavailable on the machine, open `supabase/DRIVEDESK_FULL_SETUP.sql` (historical filename), copy only the safe patch block between `-- BEGIN DRIVEDESK_SAFE_PATCH` and `-- END DRIVEDESK_SAFE_PATCH`, paste it into Supabase SQL Editor, and run it there.

## Supabase

The single SQL source of truth is:

```text
supabase/DRIVEDESK_FULL_SETUP.sql
```

The default script applies only the safe patch section between:

```text
-- BEGIN DRIVEDESK_SAFE_PATCH
-- END DRIVEDESK_SAFE_PATCH
```

The SQL file keeps its historical filename. The safe patch must not drop production data. Do not paste the full SQL file into a live database: the full reset part is only for rebuilding a disposable development database.

## Product State

Done or partially done:

- Public student page with booking flow.
- Student login by phone + password.
- Optional profile creation after booking.
- Student dashboard with next lessons and schedule.
- Admin login and hidden admin URLs.
- Admin management for bookings, branches, instructors, slots, settings.
- Multi-slot booking limit controlled by school settings.
- Category-based booking and category settings.
- Instructor profile photos.
- Supabase-backed booking and profile RPCs.
- Cloudflare Pages deployment publishes to `vroom.today`.

Still transitional:

- The app still syncs Supabase data into an in-memory compatibility layer on startup. This keeps existing admin screens working while the data layer is being completed.
- Admin authentication is still a temporary access gate, not production-grade role-based auth.
- Admin screens still render through an in-memory compatibility layer while Supabase-backed admin reads are being completed.

## Next Product Priorities

1. Move admin reads fully to Supabase. In Supabase mode, admin screens still use an in-memory compatibility bridge; session/local storage remains for UI/session state and some student fallback/cache paths while admin persistence is being completed.
2. Replace temporary staff passwords with real Supabase Auth roles.
3. Add admin-visible student profile completeness, branch-change requests, and assigned instructor/branch flows.
4. Add a practical launch checklist for a new school: school data, branches, instructors, categories, slots, booking rules, public link.
5. Add browser smoke tests for student booking, profile creation, returning login, admin booking management, and settings persistence.
6. Polish the mobile student flow after the data layer is stable.
