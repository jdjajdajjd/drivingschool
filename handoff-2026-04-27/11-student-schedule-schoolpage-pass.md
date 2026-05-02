# Handoff: Student Schedule And School Page UX Pass

Date: 2026-05-03
Branch: `main`
Latest commit deployed: `4c14de9 Simplify student schedule UX`

## Summary

This pass focused on making the student mobile interface more logical and less noisy. The main work was around the student home schedule card, the full schedule tab, and the public school page.

The changes were deployed to Cloudflare Pages and live-smoked on `https://vroom.today/student` and `https://vroom.today/school/virazh`.

## Commits In This Pass

- `5012eb0 Refine student schedule filters`
- `4c14de9 Simplify student schedule UX`

Earlier relevant deployed commits:

- `b55d8d0 Fix student schedule calendar`
- `4b6eace Reduce student mobile UI density`
- `cb4c122 Avoid Supabase refresh when unconfigured`

## Files Changed

- `src/pages/StudentPage.tsx`
- `src/pages/SchoolPage.tsx`
- `src/index.css`

Intentionally not touched/committed:

- `package.json`
- `package-lock.json`
- `.vite/`
- `opencode.json`
- `hochuvodit/`
- `output/`
- preview logs
- untracked handoff files not created in this pass
- untracked instructor PNGs

## Student Page Changes

### Home Schedule Card

The home schedule card was changed from a confusing mixed calendar/instructor strip into a quick schedule preview.

Implemented:

- Selected instructor pill remains visible on the main schedule card.
- Tapping selected instructor or `Сменить` opens a bottom sheet, not the schedule tab.
- Instructor list was removed from below the mini calendar card.
- Dates are now horizontally scrollable for quick browsing.
- Tapping a date changes the home card in place and does not switch to the full schedule tab.
- Schedule card slot list is horizontally scrollable.
- Slots shown on home are filtered by selected instructor.
- `Все / Основное / Дополнительное` filters now change the slots shown.
- Saturday abbreviation is forced to `СБ` instead of date-fns `СУ`.
- The default payment placeholder card was removed from home.
- Empty booking card text was changed from `Запишитесь на первое занятие` to `Вы пока не записаны` with helper text `Выберите свободное окно ниже или откройте расписание`.

### Instructor Bottom Sheet

Added `InstructorSheet` in `StudentPage.tsx`.

Behavior:

- Opens over the current screen with a dim overlay.
- Selected instructor appears first.
- Shows instructor name and car.
- Has `Выбран` status pill for current instructor.
- Closes by tapping overlay, `Закрыть`, or selecting an instructor.

### Full Schedule Tab

Implemented/refined:

- Instructor chips remain in full schedule tab.
- Selected instructor is sorted first in the chip list.
- Filter chips remain above the month calendar.
- Calendar size is compacted: smaller month title, smaller day circles, tighter vertical gaps.
- Month arrows are disabled and grey when no slots exist in previous/next month.
- This avoids the prior “click arrow and it just twitches” behavior.
- Filtered schedule list uses selected instructor and selected lesson filter.

### Scrollbars

Global scrollbar styling was changed in `src/index.css`:

```css
* { scrollbar-width: none; }
*::-webkit-scrollbar { width: 0; height: 0; display: none; }
```

This hides the visible translucent scrollbar that appeared while horizontal lists were scrolled.

## School Page Changes

`src/pages/SchoolPage.tsx` was simplified from a booking/schedule landing page into an informational student-facing school page.

Removed:

- Booking CTA `Записаться`.
- Nearest slot card.
- Instructor selection behavior leading to booking.
- Schedule tab.
- Public bottom navigation with `Главная / Расписание / Кабинет`.

Added/kept:

- Single `Вернуться в кабинет` button at the top.
- School logo/name/description card.
- Basic stats: branches, instructors, category.
- Contacts card: address, phone, email.
- Branches list.
- Informational instructors strip.

QA caught and fixed a runtime error on this page:

- Error: `ReferenceError: React is not defined`
- Cause: this project still needs `import React from 'react'` for JSX in some files.
- Fix: import React and `void React` in `SchoolPage.tsx`.

## Validation

Commands run successfully:

- `npm.cmd run typecheck`
- `npm.cmd run build`

Local mobile QA at `390x844`:

- `/student`
- `/school/virazh`

Live mobile QA at `390x844`:

- `https://vroom.today/student`
- `https://vroom.today/school/virazh`

Live results:

- Student page bundle: `https://vroom.today/assets/index-DvQTCc0l.js`
- `scrollWidth: 390`
- `bodyScrollWidth: 390`
- Console errors: `0`
- Warning: `Supabase is not configured. Public demo data will be used where possible.` This is expected for placeholder Supabase config.

Verified live student page:

- No default `Расчёты пока не подключены` card.
- Empty booking card says `Вы пока не записаны`.
- `СБ` appears for Saturday.
- Date click changes home schedule in place.
- `Сменить` opens instructor sheet.
- Full schedule keeps selected instructor first.

Verified live school page:

- No bottom nav.
- No `Записаться` text.
- `Вернуться в кабинет` is present.
- No horizontal overflow.
- Console errors: `0`.

## Current Known Issues / Follow-Up

- Student page still has a lot of responsibilities in one file; future work should split schedule pieces into components once UX stabilizes.
- Lesson type filter is heuristic: `slot.duration > 90 || hour >= 15` means `Дополнительное`; this should become a real field on slots if product needs true lesson types.
- Payment/notifications are removed from default UI, but there is no admin-driven notification/payment feed yet.
- Chat tab is still placeholder-like and needs product decisions.
- Theory tab is mostly static and should either connect to actual modules/progress or be hidden/disabled until ready.
- Instructor sheet is local state only; selected instructor is not persisted between sessions.

## Resume Prompt

Continue from commit `4c14de9 Simplify student schedule UX` on `main`. The next task should be a full interface audit and cleanup plan. Do not touch unrelated dirty files (`package*.json`, untracked logs/assets/handoff refs). Focus on student-facing UX first, then booking flow, then public school page. Run `npm.cmd run typecheck`, `npm.cmd run build`, Playwright mobile QA, then commit/push/deploy if making changes.
