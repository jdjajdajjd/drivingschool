# DriveDesk mega handoff after UX, instructors, categories, schedule

Date: 2026-04-27
Repo: `jdjajdajjd/drivingschool`
Local path: `C:\Users\Admin\Desktop\DRIVING-SCHOOLS`
Branch: `main`
Production URL: `https://drivingschool-6wy.pages.dev/school/virazh`
Cloudflare Pages project: `drivingschool`

## Very Short Resume Prompt For The Next Chat

You are Codex, senior frontend/fullstack engineer. Continue DriveDesk from `C:\Users\Admin\Desktop\DRIVING-SCHOOLS`.

First read:

- `handoff-2026-04-27/README.md`
- `handoff-2026-04-27/01-full-context.md`
- `handoff-2026-04-27/02-next-actions.md`
- `handoff-2026-04-27/04-runbook.md`
- `handoff-2026-04-27/дополнение.md`
- `handoff-2026-04-27/05-mega-handoff-after-ux-and-schedule.md`

Then run:

```powershell
git status --short
git log --oneline -8
npm.cmd run typecheck
npm.cmd run build
```

Current product direction:

- DriveDesk is a SaaS for driving schools.
- Main product must be simple for students from 16 to 70.
- Main student scenario: school page or student cabinet -> book lesson -> confirmation -> cabinet.
- Admin scenario: calm 40+ friendly launch wizard and simple setup.
- No fake metrics, no fake student progress, no placeholder product flows.
- Supabase is the source of truth, but some frontend/local bridges still exist and must be removed gradually.
- Do not commit `.env.local`.
- Do not write real keys or passwords to markdown.
- SQL changes must stay in `supabase/DRIVEDESK_FULL_SETUP.sql`.
- Ask before deleting cloud projects, cloud data, secrets, or local files.

## Current Git State At Handoff Time

Latest committed and pushed commit:

```text
3c668b0 feat: make schedule slots horizontally scrollable
```

Recent commits:

```text
3c668b0 feat: make schedule slots horizontally scrollable
0b7fcd1 feat: add launch wizard and category settings
c9a2fca feat: add instructor profile photos
cd0ff59 feat: simplify student flow and admin launch
5c44088 perf: split route and supabase bundles
84b5123 feat: connect schedule to booking flow
61040ec feat: add schedule filters and category booking
1b5acc9 feat: add public school overview
```

`main` has been pushed to GitHub. Cloudflare Pages deployment for `3c668b0` succeeded.

Expected `git status --short` still has untracked files:

```text
?? handoff-2026-04-27/дополнение.md
?? preview.err.log
?? preview.out.log
?? public/instructors/fem1.png
?? public/instructors/fem2.png
?? public/instructors/fem3.png
?? public/instructors/fem4.png
?? public/instructors/fem5.png
?? public/instructors/male1.png
?? public/instructors/male2.png
?? public/instructors/male3.png
?? public/instructors/male4.png
?? public/instructors/male5.png
```

Important:

- The original instructor PNG files are intentionally untracked. Optimized WebP versions were already committed earlier.
- `preview.out.log` and `preview.err.log` are untracked local logs from `npm run preview`.
- Do not delete these untracked files without user confirmation. Local deletion needs confirmation.
- This new handoff file is also untracked until explicitly staged.

## Production And Verification State

Cloudflare deployment for latest commit:

```text
project: drivingschool
commit: 3c668b0830622c597013369b169c72d8f6dbd722
short deployment id: 929b1c88
deployment URL: https://929b1c88.drivingschool-6wy.pages.dev
latest stage: deploy
status: success
```

Production check:

```powershell
Invoke-WebRequest -Uri 'https://drivingschool-6wy.pages.dev/school/virazh' -UseBasicParsing -TimeoutSec 30
```

Result at handoff time: HTTP `200`.

Local preview:

- In-app browser was left on `http://127.0.0.1:4173/school/virazh`.
- At handoff time no process was listening on port `4173`.
- To reopen local preview:

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

Build checks that passed after the latest schedule change:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## What Was Done In The Latest Work Session

### 1. Student/public UX was reworked into a calmer service flow

Main file:

- `src/pages/SchoolPage.tsx`

The public school page now behaves more like a real school entry point instead of only a booking funnel:

- home mode: school intro, categories, instructors, branches, CTA to book;
- dashboard mode: student cabinet if local profile exists;
- booking mode: compact wizard;
- schedule mode: public schedule;
- settings mode: student profile settings;
- login mode: student login.

The student flow direction is now:

```text
public school page -> book lesson -> confirmation/profile offer -> student cabinet
```

If a student already has a local profile:

```text
school page -> cabinet -> book more / schedule / settings
```

### 2. Instructor profile photos were added

Files:

- `src/services/instructorPhotos.ts`
- `src/components/ui/Avatar.tsx`
- `src/pages/SchoolPage.tsx`
- `src/pages/admin/Instructors.tsx`
- `src/pages/InstructorPage.tsx`
- `public/instructors/*.webp`

The user uploaded ten PNG files:

- `male1.png` to `male5.png`
- `fem1.png` to `fem5.png`

The original PNG files were moved/left under:

- `public/instructors/*.png`

They are still untracked.

Optimized committed assets are:

- `public/instructors/male1.webp`
- `public/instructors/male2.webp`
- `public/instructors/male3.webp`
- `public/instructors/male4.webp`
- `public/instructors/male5.webp`
- `public/instructors/fem1.webp`
- `public/instructors/fem2.webp`
- `public/instructors/fem3.webp`
- `public/instructors/fem4.webp`
- `public/instructors/fem5.webp`

Current mapping in `src/services/instructorPhotos.ts`:

```text
inst-petrov   -> /instructors/male1.webp
inst-kozlov   -> /instructors/male2.webp
inst-zakharov -> /instructors/male3.webp
inst-smirnova -> /instructors/fem1.webp
inst-volkova  -> /instructors/fem2.webp
```

The public home now has an `Инструкторы` block:

- instructor photo;
- name;
- car;
- transmission;
- branch;
- categories;
- nearest available slot.

### 3. Admin launch wizard became more useful

Main file:

- `src/pages/admin/Dashboard.tsx`

The admin dashboard launch wizard is now a clickable checklist with progress:

- school data;
- branches;
- instructors;
- schedule;
- public student link.

Each item navigates to the relevant admin section or opens the public school page.

This is meant for a driving school director/admin who is not a heavy internet user.

### 4. Category settings were added in admin

Files:

- `src/types/index.ts`
- `src/services/schoolService.ts`
- `src/services/seed.ts`
- `src/pages/admin/Settings.tsx`
- `src/pages/SchoolPage.tsx`

New field in `School`:

```ts
enabledCategoryCodes?: string[]
```

Admin settings now have a `Категории обучения` section with all license categories from:

```text
src/services/drivingCategories.ts
```

Current default seed categories for Virazh:

```ts
enabledCategoryCodes: ['B', 'C', 'D']
```

Public page and booking now filter categories using:

```ts
getVisibleDrivingCategories(school, instructors)
```

Logic:

- use `school.enabledCategoryCodes` if present;
- otherwise fallback to categories supported by active instructors;
- only show categories that have at least one active instructor.

Very important limitation:

- This category setting is currently in the frontend/local model.
- It is not yet persisted to Supabase because the existing Supabase RPC/table schema was not changed in this session.
- `updateSupabaseSchoolSettings` was intentionally not changed to include categories, because without applying SQL/RPC migration in Supabase it could break production settings saving.

Next real backend step:

- add `enabled_category_codes` to Supabase schema;
- update RPC/function used by `updateSupabaseSchoolSettings`;
- update `src/lib/supabaseTypes.ts`;
- update `src/services/supabasePublicService.ts` mapping;
- keep SQL changes only in `supabase/DRIVEDESK_FULL_SETUP.sql`;
- apply SQL in Supabase when credentials/session are available.

### 5. Settings page preview was improved

Main file:

- `src/pages/admin/Settings.tsx`

The public page preview now shows:

- school logo/name/description;
- selected category chips;
- branch count;
- instructor count;
- visible `Записаться` CTA.

This makes admin setup more understandable before copying the public link.

### 6. Schedule is now horizontally scrollable by day

Main file:

- `src/pages/SchoolPage.tsx`

Latest commit:

```text
3c668b0 feat: make schedule slots horizontally scrollable
```

Changed two student-facing places:

1. Public schedule view:

```text
view === 'schedule'
ScheduleOverview
```

2. Booking flow time step:

```text
step === 'time'
slotsByDate.map(...)
```

Before:

- every day rendered as a grid of many slot cards;
- page became tall and noisy.

Now:

- each day is one compact block;
- inside the day, slots are a horizontal row;
- the student sees first few slots;
- if there are more than three, a small hint says `листайте время`;
- user scrolls horizontally to see later times.

Local preview verification:

- opened `http://127.0.0.1:4173/school/virazh`;
- clicked `Расписание`;
- DOM showed `Расписание автошколы`;
- DOM showed `листайте время`;
- DOM showed actual slot times like `09:00`.

## Current Important Files And Responsibilities

### Public student app

File:

- `src/pages/SchoolPage.tsx`

Responsibilities:

- public school home;
- student dashboard;
- student login;
- booking wizard;
- profile settings;
- schedule overview;
- local student profile storage;
- booking to Supabase via public service.

Important functions/components:

- `getVisibleDrivingCategories`
- `SchoolHome`
- `StudentDashboard`
- `ScheduleOverview`
- `LoginPanel`
- `ProfileSettings`
- `SchoolPage`
- `saveStudentProfile`
- `loadStudentProfile`
- `isProfileComplete`
- `slotDateTime`

Watch this file carefully. It is large and should probably be split later.

### Admin dashboard

File:

- `src/pages/admin/Dashboard.tsx`

Responsibilities:

- today view;
- stats;
- nearest bookings;
- clickable launch wizard;
- public link block;
- branch quick check.

### Admin settings

File:

- `src/pages/admin/Settings.tsx`

Responsibilities:

- school basics;
- public link;
- public page preview;
- enabled categories;
- booking limits;
- branch selection mode;
- max slots per booking;
- default lesson duration;
- base tariff section;
- local starter data reset.

Important:

- The reset action clears local working snapshot. Ask before any destructive local cleanup outside existing user-triggered UI.

### Schedule/admin slots

File:

- `src/pages/admin/Slots.tsx`

Responsibilities:

- create one slot;
- create bulk schedule;
- filter slots;
- open booking;
- hide/return slot;
- delete available slot.

Potential next improvement:

- Admin slot list is still vertical cards. User only asked for student schedule to become compact. Admin could also become calendar-like later.

### Supabase services

Files:

- `src/services/supabasePublicService.ts`
- `src/services/supabaseAdminService.ts`
- `src/services/supabaseSync.ts`
- `src/lib/supabase.ts`
- `src/lib/supabaseTypes.ts`

Important current state:

- bookings create in Supabase;
- public school bundle loads from Supabase when available;
- some admin actions sync to Supabase;
- still not fully converted from localStorage/local db bridge;
- Supabase Auth/RLS/roles are not finished.

Do not casually change RPC argument shape without updating SQL and applying it.

### SQL

Single SQL file rule:

```text
supabase/DRIVEDESK_FULL_SETUP.sql
```

If next chat changes Supabase schema, keep it in this file.

Do not add random new SQL migration files unless the user explicitly changes the project rule.

## Security And Secret Handling

Do not commit:

- `.env.local`;
- real Supabase keys;
- Cloudflare tokens;
- service role keys;
- passwords;
- browser/session secrets.

Do not paste real keys into markdown.

The Cloudflare API response can expose env var values. Do not copy them into docs or commits.

The user provided staff/root login credentials in the chat earlier. Do not write those passwords into repo markdown. If the next chat needs them, ask the user to provide them again or refer to the previous chat context if available.

Ask before:

- deleting Cloudflare projects;
- deleting local files;
- deleting cloud data;
- deleting secrets;
- changing access/sharing;
- applying irreversible Supabase changes;
- submitting external forms/messages.

## Known Current Limitations

### 1. Categories are not persisted in Supabase yet

Admin category UI exists and works in the local frontend model.

But Supabase schema/RPC does not yet store:

```text
enabledCategoryCodes / enabled_category_codes
```

Because of this:

- category choices may not persist across devices or fresh Supabase reloads;
- public page falls back to instructor-supported categories;
- current Virazh still shows B/C/D because instructors support B/C/D.

Next backend task should fix this properly.

### 2. Student profile is still localStorage-based

Student cabinet/profile uses localStorage as a local session bridge.

It is better than before, but still not real auth.

Next product-grade step:

- Supabase Auth or a controlled auth table;
- roles: student, instructor, admin/director, superadmin;
- RLS;
- server-side/DB-backed sessions;
- no trust in localStorage for permissions.

### 3. SchoolPage is too large

`src/pages/SchoolPage.tsx` is doing too much:

- storage;
- auth-ish local profile;
- public page;
- booking;
- schedule;
- settings;
- confirmation/profile offer.

Eventually split into:

- `SchoolHome.tsx`;
- `StudentDashboard.tsx`;
- `BookingWizard.tsx`;
- `ScheduleOverview.tsx`;
- `StudentProfileSettings.tsx`;
- hooks/services for booking state.

Do not split just for aesthetics if working on urgent product behavior. But it is getting heavy.

### 4. No full Playwright test suite yet

Manual preview checks were done, but there are no reliable e2e tests for:

- booking one lesson;
- booking multiple lessons;
- creating profile after booking;
- login by phone/password;
- incomplete profile modal;
- admin launch wizard;
- category settings.

Add tests when flow stabilizes.

### 5. Admin schedule can be improved

Admin `Расписание` still lists slots as vertical management cards.

Possible future admin UX:

- week/day calendar;
- instructor timeline;
- compact table;
- bulk actions;
- conflict highlighting;
- per-instructor availability templates.

User recently asked specifically about student schedule horizontal scrolling, and that is done.

## Suggested Next Work Order

### Step 1. Make category settings real in Supabase

Why:

- UI exists, but persistence is incomplete.

Tasks:

1. Add `enabled_category_codes` to `schools` in `supabase/DRIVEDESK_FULL_SETUP.sql`.
2. Update school settings RPC/function to accept category codes.
3. Update `src/lib/supabaseTypes.ts`.
4. Update public/admin mapping in Supabase services.
5. Update `updateSupabaseSchoolSettings` signature.
6. Run `npm.cmd run typecheck`.
7. Run `npm.cmd run build`.
8. Apply SQL only when Supabase access is available.

### Step 2. Continue removing localStorage bridge

Priority:

- bookings;
- students;
- profiles;
- admin settings.

Keep localStorage only for temporary local session until real auth exists.

### Step 3. Auth and roles

Roles needed:

- student;
- instructor;
- admin/director;
- superadmin.

Important:

- Do not rely on hidden routes/passwords for real security.
- Current staff/root entrances are service gates, not production-grade auth.
- Add RLS before real customer launch.

### Step 4. Booking group polish

Some group work is already present:

- booking can select multiple slots up to `maxSlotsPerBooking`;
- confirmation/review shows selected slots;
- dashboard can show future lessons.

Still verify deeply:

- if selected multiple lessons, final profile/cabinet always shows all;
- booking group id is consistent;
- Supabase records are linked;
- admin views group bookings clearly;
- cancellation/reschedule handles grouped bookings safely.

### Step 5. Admin launch wizard as a real setup assistant

Current wizard is clickable checklist.

Possible next level:

- each step opens a focused setup panel;
- categories can be configured from wizard;
- branch/instructor/schedule completeness checks;
- copy public link after all required checks pass;
- show blocking missing items without scary language.

### Step 6. Visual/mobile polish pass

Run the app on:

- mobile 375px;
- desktop 1365px+.

Check:

- no overlapping text;
- buttons are at least comfortable finger targets;
- horizontal schedule feels discoverable;
- bottom mobile nav does not hide important CTAs;
- admin settings category cards are not too dense.

## Commands Cheat Sheet

Install deps if needed:

```powershell
npm.cmd install
```

Typecheck:

```powershell
npm.cmd run typecheck
```

Build:

```powershell
npm.cmd run build
```

Dev server:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Production preview:

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

Check prod:

```powershell
Invoke-WebRequest -Uri 'https://drivingschool-6wy.pages.dev/school/virazh' -UseBasicParsing -TimeoutSec 30
```

Git:

```powershell
git status --short
git log --oneline -8
git diff --stat
git diff --check
```

Commit/push pattern:

```powershell
git add <files>
git commit -m "feat: ..."
git push origin main
```

PowerShell note:

- Use `npm.cmd`, not `npm`, because PowerShell execution policy can block `npm.ps1`.
- Do not use `&&` in this PowerShell. Run separate commands.

## Files Changed In The Last Three Commits

### `3c668b0 feat: make schedule slots horizontally scrollable`

File:

- `src/pages/SchoolPage.tsx`

What changed:

- public schedule day blocks now contain horizontal scroll rows;
- booking time step now contains horizontal scroll rows;
- added small `листайте время` hint when a day has more than three slots.

### `0b7fcd1 feat: add launch wizard and category settings`

Files:

- `src/pages/SchoolPage.tsx`
- `src/pages/admin/Dashboard.tsx`
- `src/pages/admin/Settings.tsx`
- `src/services/schoolService.ts`
- `src/services/seed.ts`
- `src/types/index.ts`

What changed:

- clickable admin launch wizard;
- school enabled categories in frontend model;
- admin category settings UI;
- public page category filtering;
- booking category filtering;
- settings page preview improvements.

### `c9a2fca feat: add instructor profile photos`

Files:

- `public/instructors/*.webp`
- `src/services/instructorPhotos.ts`
- `src/components/ui/Avatar.tsx`
- `src/pages/SchoolPage.tsx`
- `src/pages/admin/Instructors.tsx`
- `src/pages/InstructorPage.tsx`

What changed:

- optimized instructor photos;
- instructor avatars now use real photos where mapped;
- public/admin/instructor pages show photos.

## Manual Test Checklist For Next Chat

Student:

1. Open `/school/virazh`.
2. Confirm home page shows school, categories B/C/D, instructors with photos, branches.
3. Click `Расписание`.
4. Confirm each day is compact and slots scroll horizontally.
5. Click an available slot from schedule.
6. Confirm booking wizard goes to details/review.
7. Book one lesson with name/phone.
8. Confirm success screen offers profile creation.
9. Create profile.
10. Confirm cabinet shows real future lesson.
11. Book two lessons if `maxSlotsPerBooking` allows it.
12. Confirm review/cabinet show both future lessons.
13. Logout.
14. Login by phone/password.

Admin:

1. Open staff entrance.
2. Login using credentials provided by user in chat, not from markdown.
3. Confirm dashboard shows `Сегодня`.
4. Confirm launch wizard is clickable.
5. Open settings.
6. Toggle categories.
7. Save settings.
8. Confirm local UI updates.
9. Remember category persistence is not Supabase-backed yet.
10. Open schedule/admin slots and create a small test slot if safe.

Production:

1. Push to `main`.
2. Watch Cloudflare Pages project `drivingschool`.
3. Confirm latest deployment is success.
4. Confirm `https://drivingschool-6wy.pages.dev/school/virazh` returns `200`.
5. If checking UI visually, beware Cloudflare/browser cache.

## Product Taste Notes

Keep DriveDesk calm and useful:

- no noisy landing-page hero;
- no fake metrics;
- no fake progress;
- no fake theory hours;
- no random decorative gradients;
- large clear buttons;
- short Russian text;
- cards only for real things: lesson, instructor, branch, student;
- show real next action;
- make admin setup feel like a guided checklist, not a CRM cockpit.

For students 40+:

- fewer choices per screen;
- one primary CTA;
- obvious `Назад`;
- phone-friendly forms;
- no tiny text in core flow;
- schedule must not be a giant vertical wall.

For younger users:

- keep flow quick;
- no mandatory registration before booking;
- photos and nearest times help choose faster.

For school admins/directors:

- setup should answer: what is missing, where do I click, what link do I send students.
- avoid technical wording like localStorage, browser data, RPC, RLS in the UI.

## Final State Summary

DriveDesk is now much closer to a sellable product shell:

- public school page exists;
- booking flow exists;
- student cabinet exists;
- instructor photos exist;
- admin dashboard has launch wizard;
- categories are configurable in UI;
- schedule is more compact and mobile-friendly;
- production deploy is healthy.

The biggest remaining gap is backend hardening:

- real Supabase persistence for all school settings;
- proper auth/roles;
- RLS;
- removal of localStorage as a trust boundary.

Next chat should start there unless the user asks for another UX pass.
