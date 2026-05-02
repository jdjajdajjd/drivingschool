# Overnight Student UI Final Handoff

Date: 2026-05-03

## Commits Deployed
- `9386115 Improve student profile and driving progress`
- `c514a0d Add student info sheets and theory progress`

## Main Results
- Profile avatar now applies only after pressing `Сохранить`.
- Profile fields are protected after initial input and unlock via subtle pencil icons:
  - `ФИО`
  - `Телефон`
  - `Email, если понадобится`
- Profile save has dirty-state and relocks fields after saving.
- Selected instructor is persisted per school and shared between home schedule and bottom navigation schedule.
- Schedule has clearer instructor context and useful empty states.
- Profile `Вождение` now opens a dedicated driving progress screen instead of schedule.
- Added a bigger useful feature: `Маршрут обучения`, showing theory, driving, internal exam, and GIBDD exam progress in one roadmap.
- Theory now links into the learning roadmap and uses shared progress visuals.
- Profile `Инфо`, `Данные для Госуслуг`, `Акции и предложения`, and `Настройки` now open useful bottom sheets instead of dead actions.
- Added mobile touch polish for bottom navigation and buttons without changing the current compact font scale.

## Validation
- `npm.cmd run typecheck` passed before checkpoint 1.
- `npm.cmd run build` passed before checkpoint 1.
- `npm.cmd run typecheck` passed before checkpoint 2.
- `npm.cmd run build` passed before checkpoint 2.
- GitHub Actions / Cloudflare Pages deploy passed for both pushed checkpoints.

## Live QA
- Tested `https://vroom.today/student` with viewport `390x844`.
- Console errors: `0` on current live navigation.
- Horizontal overflow: none, `scrollWidth 390`, `bodyScrollWidth 390`.
- Profile fields are disabled by default in the existing demo profile.
- Driving action opens the new `Вождение` screen.
- Info action opens the new student info bottom sheet.
- Theory tab renders with progress and roadmap action.
- Schedule opened from bottom nav keeps selected instructor context.
- Tested `https://vroom.today/school/virazh` live after latest deploy: console errors `0`.

## Known Follow-Ups
- `StudentPage.tsx` is now even larger and should be split into components after this feature pass.
- Some student info values use demo fallbacks because there is no real persisted model yet for group/start/end dates.
- Driving skill progress currently uses driving hours from `StudentProgress`; real per-skill tracking would need a data model.
- `lessonType(slot)` still uses the previous heuristic for main/extra lessons.
- Existing dirty workspace files remain unrelated and intentionally uncommitted.

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
