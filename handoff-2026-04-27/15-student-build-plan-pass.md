# Student Build Plan Pass

Date: 2026-05-03

## Scope

- Executed the first build session from `NEXT_BUILD_PLAN.md`.
- Focused on safe student cabinet maintainability, truthful student UI data, booking contact polish, scrollbar scoping, and live Supabase placeholder error cleanup.
- Preserved the current compact mobile density and typography.

## Commits

- `7671636 Split student cabinet utilities`
- `35316f2 Make student profile info truthful`
- `8a7b1c9 Add booking contact email field`
- `d457a67 Polish student scrollbars and school categories`
- `836a0fc Avoid placeholder Supabase public RPCs`

## Changed Files

- `NEXT_BUILD_PLAN.md`
- `src/pages/StudentPage.tsx`
- `src/pages/student/studentTypes.ts`
- `src/pages/student/studentUtils.ts`
- `src/pages/BookingFlowPage.tsx`
- `src/pages/SchoolPage.tsx`
- `src/components/product/CompactCards.tsx`
- `src/index.css`
- `src/services/supabasePublicService.ts`

## What Changed

- Extracted student cabinet types and pure utilities out of `StudentPage.tsx`:
  - view/filter/profile/info sheet types
  - booking resolver
  - instructor storage key
  - name/date/time/percent helpers
  - slot filtering and lesson type heuristic
  - avatar data URL compression
- Removed fake student info values from the student info sheet:
  - no hardcoded `15-26`
  - no hardcoded training start date
  - no hardcoded driving start date
  - unknown values now show `Пока не назначено`
- Made the internal exam copy honest when no date exists: `Назначит автошкола`.
- Reframed `Госуслуги` sheet as `Данные ученика` and explicitly states there is no Госуслуги integration.
- Replaced fake offers framing with practical `Рекомендации`.
- Replaced `Списания и начисления: 0` with `Пройдено занятий`, derived from completed bookings.
- Added profile validation before saving:
  - non-empty name
  - valid Russian phone
  - valid email if present
  - warning confirmation when changing phone because bookings are phone-linked
- Replaced fake `Чат` tab label/content with honest `Связь` contact hub.
- Added school/instructor/document/help/notification contact rows in `Связь`.
- Added optional email field to booking contacts step.
- Booking flow now pre-fills email from the existing student profile.
- Made `/school/virazh` category stat dynamic from `school.enabledCategoryCodes`.
- Scoped scrollbar hiding to `.no-scrollbar` instead of hiding scrollbars globally for the entire app.
- Applied `.no-scrollbar` to student/public horizontal scrollers.
- Added Supabase configuration guard in public service RPC functions so placeholder `https://example.supabase.co` is not called.

## Validation

Commands passed after relevant checkpoints:

- `npm.cmd run typecheck`
- `npm.cmd run build`

Latest final local validation:

- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

GitHub Actions / Cloudflare Pages deploys:

- `25290786184` success for `7671636`
- `25290859930` success for `35316f2`
- `25290899142` success for `8a7b1c9`
- `25290933785` success for `d457a67`
- `25291057837` success for `836a0fc`

## Live QA

Viewport: `390x844`

Checked `https://vroom.today/student`:

- console errors: `0`
- bottom nav shows `Связь`, not `Чат`
- no horizontal overflow in checked states
- home rendered with schedule and slots
- `Связь` rendered contact rows:
  - school phone
  - instructor phone
  - documents/help
  - notifications not connected
- profile info sheet opened
- fake group/date values were absent
- unknown student info showed `Пока не назначено`

Checked `https://vroom.today/school/virazh`:

- console errors: `0`
- dynamic categories showed `B, C, D`
- no horizontal overflow in checked state

Checked `https://vroom.today/student/book`:

- console errors after final Supabase guard: `0`
- previous live issue `ERR_NAME_NOT_RESOLVED @ https://example.supabase.co/rest/v1/rpc/public_create_booking` is gone
- booking flow still renders and local/demo booking path remains available

Known live warning:

- Supabase not configured warning remains expected for placeholder demo config.

## Residual Risks

- `StudentPage.tsx` is still large. Only utilities/types were extracted in this pass. Full component split remains needed.
- `lessonType(slot)` is still heuristic. Real `lessonType` field remains a future task.
- Student progress/training info still lacks a real admin-driven model.
- `Связь` is a contact hub, not a real chat. This is intentional and more honest than the previous fake chat.
- Phone change warning uses `window.confirm`; it is functional but should eventually become a styled bottom sheet.
- Booking flow can show locally booked state from prior local demo actions in the same browser session.
- Admin invalid Tailwind fragments were not addressed in this pass.
- Real Supabase-first admin/data migration remains future work.

## Dirty Workspace Not Touched

- `package.json`
- `package-lock.json`
- `.vite/`
- `fix-colors.cjs`
- old untracked handoff files
- `hochuvodit/`
- `opencode.json`
- `output/`
- preview logs
- untracked instructor PNGs

## Recommended Next Work

1. Continue splitting `StudentPage.tsx` into actual view/schedule/profile components.
2. Add real `lessonType` to `Slot` and admin slot creation.
3. Add assigned instructor behavior from `Student.assignedInstructorId`.
4. Add student lesson detail sheet and completed lesson history.
5. Add admin student progress/training info editor.
6. Clean invalid Tailwind fragments in admin pages.
