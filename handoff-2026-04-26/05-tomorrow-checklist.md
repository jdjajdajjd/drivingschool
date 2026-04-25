# Tomorrow checklist

## Phase 1 - Decide launch path

- [ ] Decide: real production pilot or polished demo.
- [ ] If real pilot: choose backend storage.
- [ ] Recommended: Cloudflare D1 + Pages Functions/Workers.
- [ ] Decide which Cloudflare Pages project stays.
- [ ] Recommended: keep `drivingschool`, remove `drivedesk` workflow/project.

## Phase 2 - Backend foundation

- [ ] Add backend API structure.
- [ ] Add D1 schema/migrations.
- [ ] Move schools/branches/instructors/students/slots/bookings from localStorage to API.
- [ ] Add booking policies table.
- [ ] Add booking groups table.
- [ ] Add seed/import script for initial `Вираж` data.

## Phase 3 - Auth

- [ ] Add student login by phone.
- [ ] Add admin login.
- [ ] Add roles.
- [ ] Protect admin routes.
- [ ] Make `/school/:slug` load current student profile after auth.

## Phase 4 - Booking flow

- [ ] Make profile the entry screen.
- [ ] Open booking flow only from `Записаться на занятие`.
- [ ] Skip branch step if student has assigned branch.
- [ ] Click branch -> next step immediately.
- [ ] Click instructor -> next step immediately.
- [ ] Support selecting multiple days.
- [ ] Support selecting multiple slots.
- [ ] Enforce `maxSlotsPerBooking`.
- [ ] Create bookings atomically as one booking group.
- [ ] Show group confirmation.

## Phase 5 - Admin

- [ ] Add proper booking policy settings.
- [ ] Add assigned branch on student profile.
- [ ] Add remaining hours if needed for pilot.
- [ ] Fix slot list to show start and end time.
- [ ] Add no-overlap validation for slots.
- [ ] Add empty states and error states.

## Phase 6 - UX polish

- [ ] Review all public screens on mobile.
- [ ] Make profile useful and clean.
- [ ] Remove fake metrics.
- [ ] Make all CTA labels match destination.
- [ ] Use `Добавить в календарь`.
- [ ] Use `В профиль ученика`.
- [ ] Format durations as `1 час 30 минут`.
- [ ] Reduce visual noise in admin where it matters.

## Phase 7 - QA

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Test first-time student.
- [ ] Test returning student.
- [ ] Test fixed branch.
- [ ] Test free branch choice.
- [ ] Test one booking.
- [ ] Test two slots same day.
- [ ] Test two slots different days.
- [ ] Test occupied slot conflict.
- [ ] Test confirmation page.
- [ ] Test calendar file.
- [ ] Test admin settings.
- [ ] Test deploy.

## Phase 8 - Ship

- [ ] Commit changes.
- [ ] Push to `main` or PR branch.
- [ ] Confirm only one Cloudflare deployment runs.
- [ ] Open production URL.
- [ ] Smoke test on mobile.
- [ ] Write short release note.
