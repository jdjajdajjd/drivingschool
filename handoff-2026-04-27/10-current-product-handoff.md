# DriveDesk / Vroom: current product handoff for a fresh agent

Date: 2026-05-02  
Repo: `C:\Users\First\Desktop\DRIVING-SCHOOLS`  
GitHub: `https://github.com/jdjajdajjd/drivingschool`  
Production domain: `https://vroom.today`  
Cloudflare Pages project: `drivingschool`  
Primary product direction: mobile-first student cabinet first, booking from inside cabinet, school page later as secondary feature.

## Read this first

This project is a React + TypeScript + Tailwind single-page app for DriveDesk / Vroom, a driving school product. The user is not trying to make a generic school landing page. The current strategic direction is a mobile consumer app for students of a driving school: registration, student cabinet, payments/debt/progress/exams, then booking practice lessons from inside the cabinet.

The user was angry because the app still opened a school page / booking page first. That has been fixed and deployed. Do not regress it.

Current first screen must be:

1. User opens `https://vroom.today/` or `/`.
2. If no student profile in local storage, app redirects to `/student/register`.
3. Student registers with full name and phone only.
4. App opens `/student`.
5. Booking is a cabinet action at `/student/book`.

Do not make `/school/virazh` or direct booking the first screen again.

## Important user preference

The user speaks directly and expects action, not long theory. They want a product that feels close to the provided mobile app references:

- clean mobile iOS-like app composition;
- bottom navigation;
- cards for wallet, payments, driving progress, exams, schedule;
- strong status colors;
- compact booking slots, not a huge month calendar;
- no generic SaaS landing;
- no desktop-first dashboard;
- no useless school marketing page in the first flow;
- no email everywhere;
- registration should be full name + phone first.

They explicitly said:

- "страница автошколы нахуй не нужна на первых экранах"
- first create profile/registration, then everything from personal cabinet
- mobile is primary; desktop is secondary
- booking should not show a huge calendar because driving schools usually open slots for about a week, not 3 weeks/months
- after each meaningful change, commit so progress is not lost

## Current deployed state

Latest pushed and deployed commit at the time of this handoff:

- `430c7ff Allow GitHub deployment status updates`

Relevant recent commits:

- `43d917e Add student registration entry flow`
- `17eca19 Redesign student mobile dashboard`
- `5aafe20 Refocus booking flow on weekly slots`
- `2592f9a Make student cabinet the primary entry`
- `7d522d4 Switch deploy workflow to Cloudflare Pages`
- `efeebd6 Point Cloudflare deploy to drivingschool project`
- `430c7ff Allow GitHub deployment status updates`

GitHub Action deployment run that succeeded:

- Workflow: `Build and Deploy to Cloudflare Pages`
- Run ID: `25238833175`
- Result: success
- Cloudflare production deployment status: success

Live smoke check after deploy:

- URL checked: `https://vroom.today/`
- Mobile viewport: `390x844`
- Result:
  - redirects/lands on `https://vroom.today/student/register`
  - h1 is "Создайте кабинет ученика"
  - no school-first content
  - no booking-first content
  - no horizontal overflow

## Deployment setup

Deployment is through GitHub Actions, not local `npm run deploy`.

Workflow file:

- `.github/workflows/deploy.yml`

Current workflow:

- runs on pushes to `main`
- installs with `npm ci`
- builds with `npm run build`
- deploys `dist` to Cloudflare Pages via `cloudflare/pages-action@v1`
- uses GitHub repo secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- Cloudflare Pages project name must be `drivingschool`, not `vroom`
- permissions must include:
  - `contents: read`
  - `deployments: write`

Important history:

- Local `npm run deploy` failed because the script uses `bash node_modules/.bin/wrangler...` and this Windows environment has no WSL/bash.
- Direct local `npx wrangler pages deploy...` failed because there is no local `CLOUDFLARE_API_TOKEN`.
- That is fine. The secrets live in GitHub Actions.
- The previous workflow deployed to GitHub Pages using `peaceiris/actions-gh-pages`; that was wrong for current production.
- It has been switched to Cloudflare Pages.

Cloudflare API confirmed available projects; relevant project:

- `name: drivingschool`
- `domains: drivingschool-6wy.pages.dev`, `vroom.today`
- `production_branch: main`

## Routes

Current route setup in `src/App.tsx`:

- `/` -> `StudentPage`
- `/student/register` -> `StudentRegisterPage`
- `/student` -> `StudentPage`
- `/student/book` -> `BookingFlowPage`
- `/school/:slug` -> `SchoolPage`
- `/school/:slug/book` -> `BookingFlowPage`
- `/booking/:bookingId` -> `BookingConfirmation`
- `/admin/...` -> protected admin
- `/superadmin/...` -> protected superadmin
- `/instructor/:token` -> instructor page

Route rules going forward:

- `/` should stay student-first.
- `/student/register` should be the start for new students.
- `/student` should be the main mobile cabinet.
- `/student/book` should be the student booking entry.
- `/school/virazh` can exist but should be secondary/later, not the first experience.
- Do not reintroduce `/concept`; the experimental concept zone was previously requested to be removed.

## Product direction

Think of the product as a mobile student app for a driving school:

1. Registration by link.
2. Student enters full name and phone.
3. Student lands in cabinet.
4. Cabinet shows:
   - payment/debt status;
   - nearest lesson;
   - active bookings;
   - driving hours progress;
   - theory progress;
   - internal exam / GIBDD exam status;
   - quick actions;
   - instructor / school contact.
5. Student books lessons from inside the cabinet.
6. Booking shows only near available slots, usually up to a week.
7. Success returns to cabinet / records.

Do not optimize for:

- public marketing landing;
- desktop admin-like grids;
- a huge month calendar;
- full school profile as first screen;
- SaaS-y white/blue generic template.

## Visual references from user

The user supplied multiple image references. The common qualities:

- iPhone app mockups, mostly 390-ish mobile screens;
- light gray app background;
- white rounded cards;
- strong blue primary buttons;
- status colors: green for available/paid/progress, orange for warning/payment, red for overdue/cancelled, blue for primary/active;
- bottom nav with icons;
- wallet/payment screens;
- driving schedule screens;
- theory/progress screens;
- dark mode references exist, but current work is light mode; dark can be future option;
- booking cards are compact with time, lesson type, instructor, status, action;
- filters should feel like mobile bottom-sheet/filter screen, not desktop sidebars.

Closest current UI pieces to references:

- `src/pages/StudentRegisterPage.tsx`
- `src/pages/StudentPage.tsx`
- `src/pages/BookingFlowPage.tsx`
- `src/components/product/CompactCards.tsx`
- `src/components/ui/BottomNav.tsx`

## Current implemented behavior

### Registration

File:

- `src/pages/StudentRegisterPage.tsx`

Behavior:

- User opens `/student/register`.
- Form asks for:
  - `ФИО`
  - `Телефон`
- No email on initial registration.
- Validates name has at least two words.
- Validates Russian phone with `isValidRussianPhone`.
- Saves student profile via `saveStudentProfile`.
- Navigates to `/student`.
- If an existing profile is found, pre-fills name/phone and shows "Войти".

Storage:

- local storage key format is in `src/services/studentProfile.ts`
- `dd:student_profile:${schoolId}`

### Student cabinet

File:

- `src/pages/StudentPage.tsx`

Behavior:

- If profile exists, shows mobile cabinet.
- If no profile, redirects to `/student/register`.
- Uses school `virazh` as default school context.
- Uses local DB / seeded data.
- Bottom nav views:
  - home
  - schedule
  - progress
  - profile

Current home shows:

- profile header with student name and school;
- payment reminder if debt exists;
- metric tiles:
  - balance/debt;
  - driving hours;
  - theory topics;
- nearest lesson or empty lesson card;
- progress card;
- exam card.

Current schedule shows:

- upcoming bookings;
- booking history;
- plus button to `/student/book`;
- empty state with "Записаться".

Current progress shows:

- progress card;
- payment progress;
- payment button placeholder.

Current profile shows:

- name/phone edit;
- note field;
- save;
- logout;
- contact actions.

Known limitations:

- Many values are still mocked/local:
  - debt: `40000 / 48000`, `8000` remaining;
  - progress fallback: `12/56` driving hours, `4/30` theory;
  - exams often fallback to "не назначен";
  - payment action is visual placeholder.
- Needs stronger data model integration later.
- Some copy and visual polish still need work.

### Booking flow

File:

- `src/pages/BookingFlowPage.tsx`

Important: same component supports old `/school/:slug/book` and new `/student/book`.

Current intended primary path:

- `/student/book`

Current steps:

1. `date`
   - "Ближайшие окна"
   - available day chips limited to up to 7 dates
   - quick slots in a 2-column grid
   - user can tap a quick slot and jump toward contacts
2. `instructor`
   - instructors available on selected date
3. `time`
   - time slots for selected instructor/date
4. `contacts`
   - name + phone
   - email intentionally not required and not shown as a normal field
   - has note saying email can be added later
5. `confirm`
   - summary and confirmation
6. `success`
   - add to calendar, book again, go to cabinet
7. `account`
   - legacy-ish account creation step still exists but primary post-booking action is cabinet

Current booking decisions:

- first step is dates/nearest windows, not instructor-first and not giant calendar;
- only up to 7 day chips from `futureSlots`;
- no huge month calendar;
- booking success actions point to `/student` and `/student/book`;
- back from first step goes to `/student`, not school page.

Important services:

- `src/services/publicSchoolData.ts`
- `src/services/storage.ts`
- `src/services/bookingService.ts`
- `src/services/supabasePublicService.ts`
- `src/services/studentProfile.ts`

Booking tries Supabase first:

- `createSupabaseBooking(...)`

If it fails, it falls back to local booking:

- `createBooking(...)`

After booking:

- local student is upserted;
- booking is upserted;
- slot status is updated to booked;
- session locks are released;
- success screen is shown.

### Confirmation page

File:

- `src/pages/BookingConfirmation.tsx`

Recent behavior changed:

- If booking not found, action goes to `/student`.
- "Записаться ещё" goes to `/student/book`.
- "В кабинет" goes to `/student`.
- It no longer sends users back to school page as primary.

## Data / seed context

Seed logic:

- `src/services/seed.ts`

Default school:

- id: `school-virazh`
- slug: `virazh`
- display: `Автошкола «Вираж»`

The app seeds local data on startup:

- in `src/App.tsx`, `seedIfNeeded()`

It also starts a background Supabase sync:

- `syncSupabaseSchoolToLocalDb('virazh')`

This sync should not block the UI. App sets ready after sync or after 500ms fallback.

## Worktree warning

At the time this handoff is written, the worktree has unrelated dirty/untracked files. Do not blindly stage everything.

Known dirty/untracked things that existed before/around this work:

- `package.json`
- `package-lock.json`
- `.vite/`
- `fix-colors.cjs`
- several handoff markdown files
- `hochuvodit/`
- `output/`
- `preview.err.log`
- `preview.out.log`
- `public/instructors/fem*.png`
- `public/instructors/male*.png`

Important:

- Do not revert these unless the user explicitly asks.
- If committing your work, stage only files you intentionally changed.
- The user asked to commit after meaningful changes.

## Commands that have passed

Local checks that passed after current changes:

```powershell
npm run typecheck
npm run build
```

Runtime checks performed:

- Local mobile CDP check at `390x844`:
  - `/` -> `/student/register`
  - `/student` shows cabinet
  - `/student/book` shows weekly booking
  - no horizontal overflow
- Live mobile CDP check at `https://vroom.today/`:
  - `/` -> `/student/register`
  - registration title visible
  - no school-first content
  - no booking-first content
  - no horizontal overflow

Playwright note:

- The user said Playwright was installed, but the project did not have `playwright` as a local package.
- `npx --package playwright node ...` did not resolve as expected in this environment.
- The prior verification used Chrome DevTools Protocol directly with headless Chrome.
- If browser tests are needed later, either use the app/browser tool, install/use Playwright correctly, or continue with CDP.

## Current pain points / likely next work

### 1. Build a genuinely finished mobile student app

Current cabinet is a good first direction but not "ideal". Needs deeper pass:

- refine typography and spacing;
- make every card match reference quality;
- improve bottom navigation and touch states;
- make quick actions actually useful;
- make payment/debt/exam statuses feel real;
- make schedule and progress screens more complete.

### 2. Booking flow should become extremely convenient

Do not use a huge calendar. The mental model:

- slots open for a week;
- student wants "what can I book now";
- show days with available counts;
- then show compact cards/slots;
- let student filter by lesson type, transmission, branch, instructor;
- default to smart suggestions.

Needed improvements:

- add compact filter chips or bottom-sheet filter;
- show "today/tomorrow/this week";
- show lesson type: main driving, extra driving, theory, exam;
- show price if relevant;
- show status chips: free/booked/your booking;
- keep slot grid compact;
- avoid requiring instructor selection if auto-pick is enough;
- improve tap feedback and selected states.

### 3. Real data model for payments/progress/exams

Currently cabinet has mock-ish values. Need model:

- contract total;
- paid amount;
- debt/overdue;
- next payment date;
- transactions;
- driving category;
- hours required/completed;
- theory topics completed;
- internal exam date/status;
- GIBDD exam date/status;
- instructor assignment;
- branch/area assignment.

### 4. The school page is secondary

School page can exist later as:

- school details;
- branch info;
- instructor list;
- public schedule;
- shareable school profile.

But it must not be the product entry for students.

### 5. Admin and old production routes must not break

Do not casually rewrite:

- `/admin`
- `/superadmin`
- `/school/virazh`
- `/student`
- `/instructor/:token`

If changing shared UI components, verify admin still builds.

## Suggested next implementation plan

If a new agent continues product work, do this order:

1. Start from mobile `390x844`.
2. Open `https://vroom.today/` and local `/`.
3. Confirm root is registration, not school.
4. Improve `StudentRegisterPage` visual polish.
5. Improve `StudentPage` one view at a time:
   - home;
   - schedule;
   - progress/payment;
   - profile.
6. Refactor repeated student UI into components only when it reduces real complexity.
7. Improve `BookingFlowPage`:
   - weekly slots;
   - filters;
   - auto-pick;
   - selected/tap feedback;
   - success/cabinet handoff.
8. Run `npm run typecheck`.
9. Run `npm run build`.
10. Verify mobile no-overflow.
11. Commit.
12. Push `main` if user expects deployment.
13. Watch GitHub Action.
14. Verify Cloudflare live domain.

## File map

Primary files for current student-first direction:

- `src/App.tsx`
- `src/pages/StudentRegisterPage.tsx`
- `src/pages/StudentPage.tsx`
- `src/pages/BookingFlowPage.tsx`
- `src/pages/BookingConfirmation.tsx`
- `src/services/studentProfile.ts`
- `src/services/bookingService.ts`
- `src/services/publicSchoolData.ts`
- `src/services/storage.ts`
- `src/services/seed.ts`
- `src/components/product/CompactCards.tsx`
- `src/components/ui/BottomNav.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/PhoneInput.tsx`
- `.github/workflows/deploy.yml`

Secondary/old/public:

- `src/pages/SchoolPage.tsx`
- `/school/virazh`

Admin:

- `src/pages/admin/*`
- `src/components/layout/AdminLayout.tsx`
- `src/components/layout/AdminSidebar.tsx`

Superadmin:

- `src/pages/superadmin/*`
- `src/components/layout/SuperAdminLayout.tsx`

## Specific "do not do this" list

Do not:

- make `/` a landing page;
- make `/` open `/school/virazh`;
- make `/` open booking directly;
- put school page before profile creation;
- require email on first registration;
- build around a month calendar;
- make the UX desktop-first;
- restyle only the old school page and call it done;
- remove old production routes;
- stage all dirty files;
- change deployment project back to `vroom`;
- remove `deployments: write` from workflow permissions.

## Product language

Preferred words:

- "кабинет ученика"
- "записи"
- "ближайшие окна"
- "занятие"
- "вождение"
- "прогресс обучения"
- "напоминание о платеже"
- "экзамены"

Avoid making everything sound like:

- "school landing"
- "SaaS dashboard"
- "CRM"
- "public profile first"

## Status colors / UI semantics

Current palette direction:

- primary blue: `#2436D9`
- app background: `#F2F3F7`
- text: `#101216`
- muted text: `#727985`, `#8B929C`
- success green: `#14995B`
- warning orange: `#F06B19`
- error red: `#E53945`

Use colors semantically:

- blue: primary action / active navigation
- green: available, paid, success, completed progress
- orange: payment reminder, upcoming warning, attention
- red: overdue, cancelled, destructive
- neutral gray: completed/history/muted

## Known encoding note

Some terminal output in PowerShell may display Cyrillic as mojibake depending on encoding. Do not assume the browser is broken just because `Get-Content` output looks garbled. Verify with:

- browser render;
- Node reading UTF-8;
- actual app behavior.

If real source text is corrupted, fix it carefully file by file. Do not mass-rewrite the project.

## How to verify the critical regression

Critical regression: school page or booking appearing first.

Minimum checks:

1. Clear local storage.
2. Open `/` at mobile width.
3. Expected:
   - path becomes `/student/register`;
   - title: "Создайте кабинет ученика";
   - no "Современная автошкола";
   - no "Ближайшие окна".
4. Create/save a student profile.
5. Open `/student`.
6. Expected:
   - cabinet with payment/progress/booking CTA.
7. Open `/student/book`.
8. Expected:
   - weekly nearest windows, not month calendar.

## If deploy fails

Use this sequence:

```powershell
git push origin main
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status
gh run view <run-id> --log-failed
```

Common historical failures and fixes:

- `Project not found`: workflow had `projectName: vroom`; must be `drivingschool`.
- `Resource not accessible by integration`: missing `deployments: write`.
- local wrangler says no token: expected locally; use GitHub Actions secrets.
- local deploy script uses bash/WSL: do not rely on it in this Windows environment.

## Current repo caveat

`package.json` and `package-lock.json` are currently dirty from unrelated prior changes and include a local deploy script/wrangler dependency in the working tree, but these were not committed in the final deployment fix. Be careful. If the next agent needs to alter deployment scripts, first inspect why those files are dirty and decide intentionally.

## Last known good production behavior

As of 2026-05-02 00:20 UTC-ish:

- `https://vroom.today/` opens the student registration screen.
- It does not show the school page first.
- It does not show booking first.
- Cloudflare production deployment is successful.

Keep this invariant unless the user explicitly changes direction.
