# Student Info + Theory Checkpoint

Date: 2026-05-03

## Scope
- Second major checkpoint of the student UI pass.
- Focused on removing dead profile actions and making theory/profile info feel connected to the new progress experience.

## Changed Files
- `src/pages/StudentPage.tsx`

## What Changed
- Added reusable bottom sheet panel for student info/profile actions.
- Profile quick action `Инфо` now opens a student info sheet instead of navigating away.
- Profile list actions are no longer dead buttons:
  - `Данные для Госуслуг` opens a data readiness sheet.
  - `Акции и предложения` opens useful recommendation cards.
  - `Настройки` opens a compact settings/status sheet.
- Student info sheet includes:
  - internal exam card
  - category
  - group
  - training dates
  - driving start
  - school name
- Theory screen now uses the shared progress bar and safe percentage calculation.
- Theory screen now links to the new `Маршрут обучения` / driving progress screen.

## Validation
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

## Notes
- Kept current typography and density. Did not apply oversized reference values from `описание.txt`.
- Some info values are still demo fallbacks (`15-26`, example start dates) because real persisted fields do not exist yet.
- This checkpoint intentionally avoids schema changes; it presents available student/progress data with safe fallbacks.

## Next Checkpoint
- Run live mobile QA after deploy.
- Polish any runtime/layout issues.
- Final handoff with deployed commit list and residual risks.
