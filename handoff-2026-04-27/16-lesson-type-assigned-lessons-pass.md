# Student Lesson Type, Assigned Instructor, Lesson Details Pass

Date: 2026-05-03

## Commits
- `a0418e3 Add explicit lesson types to slots`
- `7029b00 Prefer assigned student instructors`
- `fd1f1a5 Show student lesson details`

## What Changed
- Added explicit slot lesson type: `main` / `extra`.
- Admin slot creation now has `Тип занятия` for single and bulk creation.
- Student schedule and booking cards now display `Основное вождение` / `Дополнительное вождение` from real slot data, with fallback for old slots.
- Supabase slot mapping and SQL setup now include `lesson_type` and the updated `public_create_slot` RPC signature.
- Student cabinet now prefers assigned instructor from student/profile data before localStorage fallback.
- Instructor selectors mark the assigned instructor as `Ваш` / `Закреплен за вами` when data exists.
- Booking-created student profiles now remember assigned branch and instructor from the selected booking.
- Driving page now shows nearest lesson details and a minimal completed lesson history from existing `LessonDescription` data.

## Validation
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
- GitHub Actions / Cloudflare Pages:
  - `25291395415`: success for `a0418e3`.
  - `25291492193`: success for `7029b00`.
  - `25291540020`: success for `fd1f1a5`.

## Live QA
- Checked `https://vroom.today/student` at `390x844`.
- Console for new page interactions: `0` errors, `1` expected Supabase placeholder warning.
- Profile tab opens.
- `Вождение` opens driving screen.
- Driving screen renders nearest lesson details and history empty state safely.
- Schedule opens and instructor selector bottom sheet works.
- Existing old Playwright console buffer still contained one stale `https://example.supabase.co/rest/v1/rpc/public_create_booking` resource message when querying `all=true`; current-session `error` query returned `0` messages.

## Notes
- Old local demo profiles may not have `assignedInstructorId`, so assigned labels only appear when the student/profile record has that field.
- `LessonDescription` is still local/demo-backed. Real admin-authored lesson plans remain a future backend/admin task.
- `package.json`, `package-lock.json`, old handoff files, `.vite/`, `hochuvodit/`, `output/`, preview logs, and instructor PNGs remain intentionally uncommitted.
