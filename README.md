# DriveDesk

DriveDesk is a React + Supabase demo product for driving schools. The current focus is not a marketing landing page, but a working product panel: student booking, school admin panel, super-admin panel, schedule, profiles, and launch settings.

## Current Entrances

- Demo hub: `/`
- Student page: `/school/virazh`
- School staff login: `/staff-entrance-73q`
- School admin panel after login: `/virazh-office-73q`
- Super-admin login: `/root-entrance-91x`
- Super-admin panel after login: `/drivedesk-root-91x`
- Instructor demo cabinet: `/instructor/tok-petrov-2024`

Default demo credentials are defined in `src/services/accessControl.ts` and can be overridden with Vite environment variables.

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
```

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

If direct database DNS is unavailable on the machine, open `supabase/DRIVEDESK_FULL_SETUP.sql`, copy only the safe patch block between `-- BEGIN DRIVEDESK_SAFE_PATCH` and `-- END DRIVEDESK_SAFE_PATCH`, paste it into Supabase SQL Editor, and run it there.

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

The safe patch must not drop production data. Do not paste the full SQL file into a live database: the full reset part is only for rebuilding a disposable demo database.

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
- Cloudflare Pages deployment through the `drivingschool` project.

Still transitional:

- The app still syncs Supabase data into localStorage on startup. This keeps the demo fast, but it is not the final architecture.
- Admin authentication is still a demo gate, not production-grade role-based auth.
- Some admin screens write locally first and then persist to Supabase through RPCs.

## Next Product Priorities

1. Move admin reads/writes fully to Supabase and keep localStorage only for local session convenience.
2. Replace demo staff passwords with real Supabase Auth roles.
3. Add admin-visible student profile completeness, branch-change requests, and assigned instructor/branch flows.
4. Add a practical launch checklist for a new school: school data, branches, instructors, categories, slots, booking rules, public link.
5. Add browser smoke tests for student booking, profile creation, returning login, admin booking management, and settings persistence.
6. Polish the mobile student flow after the data layer is stable.
