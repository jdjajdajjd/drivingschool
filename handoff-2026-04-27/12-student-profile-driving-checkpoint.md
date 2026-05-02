# Student Profile + Driving Checkpoint

Date: 2026-05-03

## Scope
- First major checkpoint of the overnight student UI pass.
- Kept existing compact typography and sizing; used `hochuvodit/описание.txt` only for functional structure ideas.

## Changed Files
- `src/pages/StudentPage.tsx`
- `src/components/ui/PhoneInput.tsx`
- `src/index.css`

## What Changed
- Profile avatar upload is now draft-only. Selecting a photo updates the preview and shows a save hint, but persisted `profile.avatarUrl`, local storage, in-memory student data, and Supabase sync only update after `Сохранить`.
- Profile fields are locked after they have values:
  - `ФИО`
  - `Телефон`
  - `Email, если понадобится`
- Locked fields have a subtle transparent pencil button next to them. Tapping the pencil unlocks only that field.
- Profile save now has a dirty-state. `Сохранить` is disabled until there are profile or avatar changes, then relocks fields after saving.
- Selected instructor is persisted per school via `localStorage` key `dd:student_selected_instructor:<schoolId>`.
- Schedule now has a top selected-instructor summary card, so opening through home or bottom nav keeps the same instructor context.
- Schedule empty state now offers useful actions instead of a generic booking card:
  - show all lesson types
  - change instructor
- Added `Вождение` screen from profile.
- Driving screen includes:
  - remaining driving hours
  - completed/total hours
  - skill progress bar
  - learning roadmap: theory, driving, internal exam, GIBDD exam
  - nearest booking shortcut
  - training car
  - pinned instructor card with change/chat actions
- Added mobile tap polish for bottom navigation and touch devices without changing current font scale.

## Validation
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

## Notes
- No old dirty files were intentionally touched.
- Existing untracked/dirty workspace files remain ignored.
- `PhoneInput` now accepts `disabled`, used by locked profile phone editing.
- The roadmap uses existing `StudentProgress` fields and safe fallbacks when demo/progress data is missing.

## Next Checkpoint
- Improve theory/info/profile actions in the same visual language.
- Add a richer student info bottom sheet or screen.
- Run mobile live QA after deploy and continue with checkpoint 2.
