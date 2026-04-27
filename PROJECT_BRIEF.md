# DriveDesk Project Brief

## Product Goal

DriveDesk is a SaaS-style operating panel for driving schools. The demo should show the actual product, not a marketing site:

- student booking and personal cabinet;
- school administrator panel;
- super-admin panel for DriveDesk;
- schedule, branches, instructors, students, bookings, and school settings.

The target user for the public booking flow is often 40+, so the interface must stay simple, readable, and low-noise.

## Core UX Rules

- One clear main action per student screen.
- Large buttons and readable text.
- No decorative clutter in booking.
- Student profile shows only real, useful information.
- Admin pages are practical and dense enough for daily work.
- Demo hub at `/` gives direct entrances into product roles.

## Current Important URLs

- `/` product demo hub
- `/school/virazh` student flow
- `/staff-entrance-73q` school admin login
- `/virazh-office-73q` school admin panel
- `/root-entrance-91x` super-admin login
- `/drivedesk-root-91x` super-admin panel

## Current Data Model

Supabase contains the production-shaped data:

- schools
- branches
- instructors
- students
- slots
- booking groups
- bookings
- staff access credentials

The app still has a compatibility layer that loads Supabase data and writes it into localStorage. This is temporary and should be reduced as the product moves toward sale.

## What Was Recently Added

- Student profile with phone + password login.
- Profile creation after booking.
- Logout from student profile.
- Admin/super-admin login pages and hidden URLs.
- Multi-slot booking support.
- Category selection for school and instructors.
- School settings for max slots, lesson duration, branch selection, and categories.
- Public schedule view.
- Instructor photos.
- Safer Supabase setup file with a safe patch section.

## Biggest Remaining Risks

- Staff auth is still demo-level and should be replaced by real roles.
- Some settings may feel saved locally before Supabase confirms them.
- Direct database patching may fail on machines without Supabase DB DNS; SQL Editor remains the fallback.
- There are no automated browser smoke tests yet.

## Recommended Next Work

1. Verify every admin setting persists after reload and affects the student page.
2. Move school admin screens to direct Supabase reads and writes.
3. Add real staff/student auth.
4. Finish student profile truthfulness: no fake progress, only known data.
5. Add launch checklist for new schools.
6. Add smoke tests before every deploy.
