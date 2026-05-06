# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining audit fixes needed to make the Vroom MVP safer for sale: confirmed Supabase admin persistence, truthful public/student data, mobile admin polish, and repeatable production smoke checks.

**Architecture:** Keep the current in-memory compatibility bridge for admin rendering, but stop optimistic fire-and-forget writes for critical admin mutations. Public pages must depend only on public Supabase data. Admin services should await Supabase when configured, update the memory bridge only after success, and fall back to memory-only behavior only when Supabase is not configured.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, Supabase/Postgres RPCs, Cloudflare Pages, Playwright MCP smoke verification.

---

## File Structure

- Modify `src/services/branchService.ts`: convert branch create/update/archive/delete semantics to confirmed async write-through helpers.
- Modify `src/pages/admin/Branches.tsx`: await branch mutations, show loading state, rename dangerous delete UX to archive/hide.
- Modify `src/services/instructorService.ts`: convert instructor create/update/toggle to confirmed async write-through helpers.
- Modify `src/pages/admin/Instructors.tsx`: await instructor mutations, show loading state, keep inactive instructors out of public availability.
- Modify `src/services/schoolService.ts`: add confirmed async school settings save while preserving sync fallback for non-Supabase mode.
- Modify `src/pages/admin/Settings.tsx`: await settings persistence before success toast, remove local-data wording.
- Modify `src/services/supabaseAdminService.ts`: add admin student profile update RPC/client helper if SQL allows; otherwise use direct upsert with anon grants already present for `students` only if verified.
- Modify `src/services/studentService.ts`: add student profile update helper for admin detail.
- Modify `src/pages/admin/StudentDetail.tsx`: await student/progress/document/request updates and remove fake defaults in progress.
- Create `scripts/smoke-vroom.mjs`: repeatable browser smoke using Playwright if available, otherwise clear actionable failure message.
- Modify `package.json`: add `smoke:vroom` script only if Playwright dependency or executable is available; if not, keep script using `npx playwright` without adding dependency unless already present.
- Modify `README.md`: update product state after audit fixes; remove current stale wording around temporary local writes where no longer true.

## Global Constraints

- Do not edit or commit `.env.local`, `.vite/`, `output/`, preview logs, browser profiles, `node_modules`, or old `handoff-*` files.
- Do not add service role keys to frontend code, workflow, docs, or repository files.
- Frontend Supabase env remains only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Keep `localStorage` only for UI/session convenience such as theme and temporary admin access; no business data should persist to `dd:*` when Supabase is configured.
- Use `apply_patch` for manual edits.
- After every task run `npm.cmd run typecheck` and `npm.cmd run build`.
- After deploy-related or public-flow changes, smoke `https://vroom.today` routes.

---

### Task 1: Confirmed Branch Persistence And Archive Semantics

**Files:**
- Modify: `src/services/branchService.ts`
- Modify: `src/pages/admin/Branches.tsx`

- [ ] **Step 1: Inspect current branch mutation behavior**

Run:

```powershell
git diff -- src/services/branchService.ts src/pages/admin/Branches.tsx
```

Expected: either no diff or only current-session changes. Do not overwrite unrelated user changes.

- [ ] **Step 2: Replace fire-and-forget branch mutations with confirmed async helpers**

In `src/services/branchService.ts`, keep existing sync functions only if still used elsewhere, and add these functions:

```ts
import { isSupabaseConfigured } from '../lib/supabase'

export async function createBranchConfirmed(input: BranchInput): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Укажите название филиала.' }

  const branch: Branch = {
    id: generateId('branch'),
    schoolId: input.schoolId,
    name,
    address: input.address?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    isActive: input.isActive,
  }

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(branch.id, { ...input, name: branch.name, address: branch.address, phone: branch.phone })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить филиал.' }
    }
  }

  db.branches.upsert(branch)
  return { ok: true, branch }
}

export async function updateBranchConfirmed(branchId: string, input: Omit<BranchInput, 'schoolId'>): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
  const current = db.branches.byId(branchId)
  if (!current) return { ok: false, error: 'Филиал не найден.' }

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Укажите название филиала.' }

  const nextBranch: Branch = {
    ...current,
    name,
    address: input.address?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    isActive: input.isActive,
  }

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(nextBranch.id, {
        schoolId: nextBranch.schoolId,
        name: nextBranch.name,
        address: nextBranch.address,
        phone: nextBranch.phone,
        isActive: nextBranch.isActive,
      })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить филиал.' }
    }
  }

  db.branches.upsert(nextBranch)
  return { ok: true, branch: nextBranch }
}

export async function archiveBranchConfirmed(branchId: string): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
  const current = db.branches.byId(branchId)
  if (!current) return { ok: false, error: 'Филиал не найден.' }

  const nextBranch: Branch = { ...current, isActive: false }

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(nextBranch.id, {
        schoolId: nextBranch.schoolId,
        name: nextBranch.name,
        address: nextBranch.address,
        phone: nextBranch.phone,
        isActive: false,
      })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось выключить филиал.' }
    }
  }

  db.branches.upsert(nextBranch)
  return { ok: true, branch: nextBranch }
}
```

- [ ] **Step 3: Update branch admin UI to await confirmed helpers**

In `src/pages/admin/Branches.tsx`:

- import `archiveBranchConfirmed`, `createBranchConfirmed`, `updateBranchConfirmed` instead of calling `createBranch`, `updateBranch`, `deleteBranchSafe` from event handlers.
- add state:

```ts
const [saving, setSaving] = useState(false)
const [archiving, setArchiving] = useState(false)
```

- change `handleSubmit` to async:

```ts
async function handleSubmit(): Promise<void> {
  if (!school || saving) return
  setSaving(true)
  const result = editingId
    ? await updateBranchConfirmed(editingId, form)
    : await createBranchConfirmed({ schoolId: school.id, ...form })
  setSaving(false)

  if (!result.ok) {
    showToast(result.error ?? 'Не удалось сохранить филиал.', 'error')
    return
  }

  setModalOpen(false)
  showToast(editingId ? 'Филиал обновлён.' : 'Филиал создан.', 'success')
}
```

- change delete confirmation to archive/hide:

```ts
async function handleArchive(): Promise<void> {
  if (!deleteId || archiving) return
  setArchiving(true)
  const result = await archiveBranchConfirmed(deleteId)
  setArchiving(false)
  setDeleteId(null)
  if (!result.ok) {
    showToast(result.error ?? 'Не удалось выключить филиал.', 'error')
    return
  }
  showToast('Филиал выключен и скрыт из публичной записи.', 'success')
}
```

- replace visible labels:

```tsx
<Button variant="danger" size="sm" onClick={() => setDeleteId(branch.id)}>
  <Trash2 size={14} />
  Выключить
</Button>
```

```tsx
<ConfirmDialog
  open={Boolean(deleteId)}
  title="Выключить филиал"
  description="Филиал останется в истории и админке, но исчезнет из публичной записи и выбора новых занятий. Связанные прошлые записи не удаляются."
  confirmLabel="Выключить филиал"
  onClose={() => setDeleteId(null)}
  onConfirm={() => void handleArchive()}
  danger
/>
```

- [ ] **Step 4: Verify branch task**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit branch task**

Run:

```powershell
git add src/services/branchService.ts src/pages/admin/Branches.tsx
git commit -m "Confirm branch admin writes before updating UI"
```

Expected: one commit; untracked temp files remain uncommitted.

---

### Task 2: Confirmed Instructor Persistence And Public Availability

**Files:**
- Modify: `src/services/instructorService.ts`
- Modify: `src/pages/admin/Instructors.tsx`
- Inspect: `src/services/supabasePublicService.ts`
- Inspect: `src/services/slotService.ts`

- [ ] **Step 1: Confirm public queries already filter active instructors**

Check `src/services/supabasePublicService.ts` for:

```ts
supabase.from('instructors').select('*').eq('school_id', school.id).eq('is_active', true).order('name')
```

Expected: public school bundle only loads active instructors. Do not change if already true.

- [ ] **Step 2: Add confirmed async instructor helpers**

In `src/services/instructorService.ts`, import `isSupabaseConfigured` and add:

```ts
import { isSupabaseConfigured } from '../lib/supabase'

export async function createInstructorConfirmed(input: InstructorInput): Promise<{ ok: boolean; instructor?: Instructor; error?: string }> {
  const trimmedName = input.name.trim()
  if (!trimmedName) return { ok: false, error: 'Укажите имя инструктора.' }
  if (!input.branchId) return { ok: false, error: 'Выберите филиал.' }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : ''
  if (normalizedPhone && !validateRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Телефон инструктора указан в неверном формате.' }
  }

  const instructor: Instructor = {
    id: generateId('inst'),
    schoolId: input.schoolId,
    branchId: input.branchId,
    name: trimmedName,
    phone: normalizedPhone,
    email: input.email?.trim() ?? '',
    token: generateInstructorToken(trimmedName),
    bio: input.bio?.trim() ?? '',
    experience: 0,
    isActive: input.isActive,
    categories: input.categories?.length ? input.categories : ['B'],
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
  }

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseInstructor(instructor.id, { ...input, phone: normalizedPhone, name: trimmedName }, instructor.token)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить инструктора.' }
    }
  }

  db.instructors.upsert(instructor)
  return { ok: true, instructor }
}

export async function updateInstructorConfirmed(
  instructorId: string,
  input: Omit<InstructorInput, 'schoolId'>,
): Promise<{ ok: boolean; instructor?: Instructor; error?: string }> {
  const current = db.instructors.byId(instructorId)
  if (!current) return { ok: false, error: 'Инструктор не найден.' }

  const trimmedName = input.name.trim()
  if (!trimmedName) return { ok: false, error: 'Укажите имя инструктора.' }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : ''
  if (normalizedPhone && !validateRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Телефон инструктора указан в неверном формате.' }
  }

  const nextInstructor: Instructor = {
    ...current,
    branchId: input.branchId,
    name: trimmedName,
    phone: normalizedPhone,
    email: input.email?.trim() ?? '',
    bio: input.bio?.trim() ?? '',
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
    categories: input.categories?.length ? input.categories : current.categories?.length ? current.categories : ['B'],
    isActive: input.isActive,
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
  }

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseInstructor(
        nextInstructor.id,
        {
          schoolId: nextInstructor.schoolId,
          branchId: nextInstructor.branchId,
          name: nextInstructor.name,
          phone: nextInstructor.phone,
          email: nextInstructor.email,
          bio: nextInstructor.bio,
          car: nextInstructor.car,
          transmission: nextInstructor.transmission,
          categories: nextInstructor.categories,
          isActive: nextInstructor.isActive,
        },
        nextInstructor.token,
      )
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить инструктора.' }
    }
  }

  db.instructors.upsert(nextInstructor)
  return { ok: true, instructor: nextInstructor }
}

export async function toggleInstructorActiveConfirmed(
  instructorId: string,
  isActive?: boolean,
): Promise<{ ok: boolean; instructor?: Instructor; error?: string }> {
  const instructor = db.instructors.byId(instructorId)
  if (!instructor) return { ok: false, error: 'Инструктор не найден.' }

  const nextInstructor: Instructor = {
    ...instructor,
    isActive: typeof isActive === 'boolean' ? isActive : !instructor.isActive,
  }

  if (isSupabaseConfigured()) {
    try {
      await updateSupabaseInstructorActive(instructorId, nextInstructor.isActive)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось изменить статус инструктора.' }
    }
  }

  db.instructors.upsert(nextInstructor)
  return { ok: true, instructor: nextInstructor }
}
```

- [ ] **Step 3: Update instructor admin UI to await confirmed helpers**

In `src/pages/admin/Instructors.tsx`:

- import `createInstructorConfirmed`, `toggleInstructorActiveConfirmed`, `updateInstructorConfirmed`.
- add state:

```ts
const [saving, setSaving] = useState(false)
const [togglingId, setTogglingId] = useState<string | null>(null)
```

- change `handleSubmit` to async and await the confirmed helper.
- change `toggle` to async:

```ts
async function toggle(instructor: Instructor): Promise<void> {
  if (togglingId) return
  setTogglingId(instructor.id)
  const result = await toggleInstructorActiveConfirmed(instructor.id)
  setTogglingId(null)
  if (!result.ok) {
    showToast(result.error ?? 'Не удалось изменить статус инструктора.', 'error')
    return
  }
  showToast(result.instructor?.isActive ? 'Инструктор включён.' : 'Инструктор выключен и скрыт из публичной записи.', 'success')
}
```

- ensure button call uses `onClick={() => void toggle(instructor)}`.
- disable save button while `saving`.

- [ ] **Step 4: Verify instructor task**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit instructor task**

Run:

```powershell
git add src/services/instructorService.ts src/pages/admin/Instructors.tsx
git commit -m "Confirm instructor admin writes before updating UI"
```

Expected: one commit.

---

### Task 3: Confirmed Settings Persistence

**Files:**
- Modify: `src/services/schoolService.ts`
- Modify: `src/pages/admin/Settings.tsx`

- [ ] **Step 1: Add confirmed async settings helper**

In `src/services/schoolService.ts`, import `isSupabaseConfigured` and add:

```ts
import { isSupabaseConfigured } from '../lib/supabase'

export async function updateSchoolConfirmed(schoolId: string, patch: Partial<SchoolInput>): Promise<{ ok: boolean; school?: School; error?: string }> {
  const school = db.schools.byId(schoolId)
  if (!school) return { ok: false, error: 'Автошкола не найдена.' }

  const result = updateSchool(schoolId, patch)
  if (!result.ok || !result.school) return result

  if (isSupabaseConfigured()) {
    try {
      await updateSupabaseSchoolSettings(schoolId, {
        name: result.school.name,
        slug: result.school.slug,
        description: result.school.description,
        primaryColor: result.school.primaryColor,
        logoUrl: result.school.logoUrl,
        bookingLimitEnabled: result.school.bookingLimitEnabled,
        maxActiveBookingsPerStudent: result.school.maxActiveBookingsPerStudent,
        branchSelectionMode: result.school.branchSelectionMode,
        maxSlotsPerBooking: result.school.maxSlotsPerBooking,
        defaultLessonDuration: result.school.defaultLessonDuration,
        enabledCategoryCodes: result.school.enabledCategoryCodes,
      })
    } catch (error) {
      db.schools.upsert(school)
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить настройки школы.' }
    }
  }

  return result
}
```

Then remove or guard the existing `persistSupabaseMutation(updateSupabaseSchoolSettings(...))` inside `updateSchool` to avoid double writes when `updateSchoolConfirmed` calls it. The minimal safe change is: remove the `persistSupabaseMutation(...)` block from `updateSchool`; all admin UI should use `updateSchoolConfirmed` after this task.

- [ ] **Step 2: Update settings UI to await confirmed save**

In `src/pages/admin/Settings.tsx`:

- import `updateSchoolConfirmed` instead of `updateSchool` for save.
- add state:

```ts
const [saving, setSaving] = useState(false)
```

- change `handleSave` to async:

```ts
async function handleSave(): Promise<void> {
  if (!school || saving) return
  // keep existing validation exactly as-is before this point
  setSaving(true)
  const result = await updateSchoolConfirmed(school.id, {
    name: form.name,
    slug: form.slug,
    description: form.description,
    primaryColor: form.primaryColor,
    logoUrl: form.logoUrl,
    bookingLimitEnabled: form.bookingLimitEnabled,
    maxActiveBookingsPerStudent: form.maxActiveBookingsPerStudent,
    branchSelectionMode: form.branchSelectionMode,
    maxSlotsPerBooking: form.maxSlotsPerBooking,
    defaultLessonDuration: form.defaultLessonDuration,
    enabledCategoryCodes: form.enabledCategoryCodes,
  })
  setSaving(false)
  if (!result.ok) {
    showToast(result.error ?? 'Не удалось сохранить настройки школы.', 'error')
    return
  }
  showToast('Настройки автошколы сохранены.', 'success')
  if (result.school?.slug !== school.slug) navigate(`${ADMIN_BASE_PATH}/settings`, { replace: true })
}
```

- update button:

```tsx
<Button onClick={() => void handleSave()} disabled={saving}>
  <Settings2 size={16} />
  {saving ? 'Сохраняем...' : 'Сохранить изменения'}
</Button>
```

- change reset toast from `Локальные данные обновлены.` to `Данные обновлены.`

- [ ] **Step 3: Verify settings task**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands exit `0`.

- [ ] **Step 4: Commit settings task**

Run:

```powershell
git add src/services/schoolService.ts src/pages/admin/Settings.tsx
git commit -m "Confirm school settings before showing success"
```

Expected: one commit.

---

### Task 4: Confirmed Student Detail Persistence And Truthful Defaults

**Files:**
- Modify: `src/services/supabaseAdminService.ts`
- Modify: `src/services/studentService.ts`
- Modify: `src/pages/admin/StudentDetail.tsx`
- Inspect: `src/services/studentProfile.ts`

- [ ] **Step 1: Add Supabase admin student update helper**

In `src/services/supabaseAdminService.ts`, add:

```ts
import type { Student } from '../types'

export async function updateSupabaseStudentAdmin(student: Student): Promise<void> {
  await runAdminMutation(
    supabase.from('students').upsert({
      id: student.id,
      school_id: student.schoolId,
      name: student.name,
      phone: student.phone,
      normalized_phone: student.normalizedPhone,
      email: student.email,
      avatar_url: student.avatarUrl ?? null,
      assigned_branch_id: student.assignedBranchId ?? null,
      assigned_instructor_id: student.assignedInstructorId ?? null,
      category_codes: student.categoryCodes ?? ['B'],
      training_stage: student.trainingStage ?? null,
      group_name: student.groupName ?? null,
      training_start_date: student.trainingStartDate ?? null,
      driving_start_date: student.drivingStartDate ?? null,
      training_end_date: student.trainingEndDate ?? null,
      driving_end_date: student.drivingEndDate ?? null,
      branch_change_requested_at: student.branchChangeRequestedAt ?? null,
      branch_change_note: student.branchChangeNote ?? null,
    }),
  )
}
```

If TypeScript rejects the typed `supabase.from('students').upsert(...)`, use `const untypedSupabase = supabase as any` local to this function.

- [ ] **Step 2: Add confirmed student patch helper**

In `src/services/studentService.ts`, import `isSupabaseConfigured` and `updateSupabaseStudentAdmin`, then add:

```ts
import { isSupabaseConfigured } from '../lib/supabase'
import { updateSupabaseStudentAdmin } from './supabaseAdminService'

export async function updateStudentAdminConfirmed(studentId: string, patch: Partial<Student>): Promise<{ ok: boolean; student?: Student; error?: string }> {
  const current = db.students.byId(studentId)
  if (!current) return { ok: false, error: 'Ученик не найден.' }

  const nextStudent: Student = { ...current, ...patch }
  if (!nextStudent.name.trim()) return { ok: false, error: 'Укажите имя ученика.' }

  if (isSupabaseConfigured()) {
    try {
      await updateSupabaseStudentAdmin(nextStudent)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить ученика.' }
    }
  }

  db.students.upsert(nextStudent)
  return { ok: true, student: nextStudent }
}
```

- [ ] **Step 3: Update student detail UI to await student and progress writes**

In `src/pages/admin/StudentDetail.tsx`:

- import `updateStudentAdminConfirmed`.
- change `updateStudentPatch` to async:

```ts
async function updateStudentPatch(patch: Partial<typeof student>): Promise<void> {
  if (!student) return
  const result = await updateStudentAdminConfirmed(student.id, patch)
  if (!result.ok) {
    showToast(result.error ?? 'Не удалось обновить данные ученика.', 'error')
    return
  }
  setVersion((value) => value + 1)
  showToast('Данные ученика обновлены.', 'success')
}
```

- update all `onChange={(event) => updateStudentPatch(...)}` to `onChange={(event) => void updateStudentPatch(...)}`.
- keep `saveStudentProgress`, `updateStudentDocument`, and `updateStudentRequestStatus` if they already write to Supabase in Supabase mode; inspect `studentProfile.ts` first. If they are fire-and-forget, convert them to async confirmed helpers following the same pattern before updating UI.
- change fake default driving total from `56` to `0` in `updateProgressPatch` and progress input:

```ts
drivingHoursTotal: progress?.drivingHoursTotal ?? 0,
```

```tsx
<Input label="Часов вождения всего" type="number" value={String(progress?.drivingHoursTotal ?? 0)} ... />
```

- [ ] **Step 4: Verify student detail task**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit student detail task**

Run:

```powershell
git add src/services/supabaseAdminService.ts src/services/studentService.ts src/pages/admin/StudentDetail.tsx src/services/studentProfile.ts
git commit -m "Persist student detail changes through Supabase"
```

Expected: one commit; if `studentProfile.ts` was not modified, Git will ignore it.

---

### Task 5: Product Wording And Forbidden Text Pass

**Files:**
- Modify: `src/App.tsx`
- Modify: `README.md`
- Modify: `PROJECT_BRIEF.md` if current product docs still mention DriveDesk/demo/localStorage as active product behavior.

- [ ] **Step 1: Remove visible/current demo route naming where safe**

In `src/App.tsx`, change:

```tsx
<Route path="/demo" element={<Navigate to="/school/virazh" replace />} />
```

to:

```tsx
<Route path="/product" element={<Navigate to="/school/virazh" replace />} />
<Route path="/demo" element={<Navigate to="/school/virazh" replace />} />
```

Keep `/demo` redirect as backward-compatible hidden route, but do not link to it anywhere.

- [ ] **Step 2: Update current docs wording**

In `README.md`:

- replace `supabase/DRIVEDESK_FULL_SETUP.sql` references only if file is not renamed; if file remains named that way, keep path but add wording that this is historical filename.
- replace `demo database` with `disposable development database`.
- replace `temporary local writes` wording with accurate current state after Tasks 1-4.

In `PROJECT_BRIEF.md`:

- change title to `# Vroom Project Brief`.
- replace `DriveDesk` with `Vroom` in active product prose.
- replace `demo should show` with `product should show`.
- replace `Demo hub` with `Product hub`.
- replace localStorage compatibility description with in-memory compatibility layer when Supabase is configured.

- [ ] **Step 3: Verify forbidden visible source text**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Then run:

```powershell
git grep -n "DriveDesk\|demo\|localStorage\|drivingschool-6wy\|онлайн-оплата\|предоплата" -- src README.md PROJECT_BRIEF.md .github/workflows/deploy.yml wrangler.toml
```

Expected: only technically justified code references remain, such as `localStorage` implementation for theme/access/session fallback. No user-facing public/admin product copy should include forbidden terms.

- [ ] **Step 4: Commit wording task**

Run:

```powershell
git add src/App.tsx README.md PROJECT_BRIEF.md
git commit -m "Clean current product wording after audit"
```

Expected: one commit.

---

### Task 6: Repeatable Smoke Script

**Files:**
- Create: `scripts/smoke-vroom.mjs`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Create smoke script**

Create `scripts/smoke-vroom.mjs`:

```js
import { chromium } from 'playwright'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://vroom.today'
const forbidden = ['DriveDesk', 'drivingschool-6wy', 'localStorage', 'онлайн-оплата', 'предоплата']

const routes = [
  {
    path: '/school/virazh',
    checks: ['Автошкола «Вираж»', 'Записаться на занятие'],
    rejects: ['Автошкола не найдена'],
  },
  {
    path: '/school/virazh/book',
    checks: ['Расписание', 'Записаться'],
    rejects: ['Автошкола не найдена'],
  },
  {
    path: '/login',
    checks: ['Телефон', 'Пароль', 'Забыли пароль?'],
    rejects: [],
  },
  {
    path: '/instructor/tok-petrov-2024',
    checks: ['Кабинет инструктора', 'Эта страница только показывает расписание'],
    rejects: ['Проведено', 'Отменено'],
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const failures = []

page.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console error: ${message.text()}`)
})

for (const route of routes) {
  const url = `${baseUrl}${route.path}`
  await page.goto(url, { waitUntil: 'networkidle' })
  const text = await page.locator('body').innerText()
  const ddKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('dd:')))

  for (const expected of route.checks) {
    if (!text.includes(expected)) failures.push(`${route.path}: missing "${expected}"`)
  }

  for (const rejected of [...route.rejects, ...forbidden]) {
    if (text.includes(rejected)) failures.push(`${route.path}: contains forbidden "${rejected}"`)
  }

  if (ddKeys.length > 0) failures.push(`${route.path}: business localStorage keys present ${ddKeys.join(', ')}`)
}

await browser.close()

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Smoke passed for ${baseUrl}`)
```

- [ ] **Step 2: Add Playwright dependency if missing**

Check `package.json`. If `playwright` is not present, add it to `devDependencies`:

```json
"playwright": "^1.56.0"
```

Then run:

```powershell
npm.cmd install
```

Expected: `package.json` and `package-lock.json` update. This is allowed for this task only because it adds the smoke dependency.

- [ ] **Step 3: Add script**

In `package.json` scripts add:

```json
"smoke:vroom": "node scripts/smoke-vroom.mjs"
```

- [ ] **Step 4: Verify smoke task**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run smoke:vroom
```

Expected: typecheck/build exit `0`; smoke prints `Smoke passed for https://vroom.today`.

- [ ] **Step 5: Commit smoke task**

Run:

```powershell
git add scripts/smoke-vroom.mjs package.json package-lock.json README.md
git commit -m "Add repeatable production smoke checks"
```

Expected: one commit.

---

### Task 7: Mobile Admin QA Fixes

**Files:**
- Modify only files where smoke/manual QA finds overflow or unreadable controls:
  - `src/pages/admin/Branches.tsx`
  - `src/pages/admin/Instructors.tsx`
  - `src/pages/admin/Settings.tsx`
  - `src/pages/admin/Students.tsx`
  - `src/pages/admin/StudentDetail.tsx`
  - `src/pages/admin/Slots.tsx`
  - `src/pages/admin/Bookings.tsx`

- [ ] **Step 1: Run mobile manual QA with Playwright MCP**

Open these routes at viewport `390x844` after logging in if needed:

```text
https://vroom.today/virazh-office-73q
https://vroom.today/virazh-office-73q/bookings
https://vroom.today/virazh-office-73q/slots
https://vroom.today/virazh-office-73q/students
https://vroom.today/virazh-office-73q/instructors
https://vroom.today/virazh-office-73q/branches
https://vroom.today/virazh-office-73q/settings
https://vroom.today/virazh-office-73q/modules
```

For each page, evaluate:

```js
(() => ({
  width: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
  ddKeys: Object.keys(localStorage).filter((key) => key.startsWith('dd:')),
}))()
```

Expected: `overflow: false` and `ddKeys: []`.

- [ ] **Step 2: Fix only observed overflow/readability issues**

Use these patterns, only where needed:

```tsx
className="grid gap-4 xl:grid-cols-[...]"
```

should remain single-column on mobile. If a child overflows, add:

```tsx
className="min-w-0 ..."
```

For long URLs/text, use:

```tsx
className="break-all ..."
```

For action grids, prefer:

```tsx
className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"
```

Do not redesign pages; make smallest fixes.

- [ ] **Step 3: Verify mobile QA task**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run smoke:vroom
```

Expected: all exit `0`.

- [ ] **Step 4: Commit mobile QA task if files changed**

Run:

```powershell
git status --short
```

If admin files changed:

```powershell
git add src/pages/admin
git commit -m "Polish admin mobile layouts after audit"
```

If no files changed, do not create an empty commit.

---

### Task 8: Final Deploy And Production Verification

**Files:**
- Inspect: `.github/workflows/deploy.yml`
- Inspect: `wrangler.toml`
- No code changes expected unless verification reveals a concrete defect.

- [ ] **Step 1: Final local verification**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run smoke:vroom
git status --short
```

Expected: commands exit `0`; only allowed untracked temp files may remain.

- [ ] **Step 2: Push current branch**

Run:

```powershell
git push origin main
```

Expected: push succeeds.

- [ ] **Step 3: Watch GitHub Actions deploy**

Run:

```powershell
gh run list --workflow "Build and Deploy to Cloudflare Pages" --branch main --limit 3
gh run watch <latest-run-id> --exit-status
```

Expected: latest run succeeds; Cloudflare deploy step succeeds.

- [ ] **Step 4: Production smoke**

Run:

```powershell
npm.cmd run smoke:vroom
```

Expected: `Smoke passed for https://vroom.today`.

- [ ] **Step 5: Final git status**

Run:

```powershell
git status --short
```

Expected: no tracked modifications. Untracked `.vite/`, `output/`, and preview logs may remain and must not be committed.

---

## Self-Review

- Spec coverage: plan covers confirmed Supabase writes for branches, instructors, settings, and student detail; wording cleanup; mobile QA; repeatable smoke; final deploy verification.
- Intentional exclusions: full Supabase Auth/RLS role replacement is not included because it requires schema/auth design and possibly service-role/server-side migration beyond the current frontend audit scope. It remains a separate security project.
- Placeholder scan: no task contains TBD/TODO/implement later. Each task has concrete file paths, code snippets, commands, and expected results.
- Type consistency: helper names are consistent across services and page tasks: `createBranchConfirmed`, `updateBranchConfirmed`, `archiveBranchConfirmed`, `createInstructorConfirmed`, `updateInstructorConfirmed`, `toggleInstructorActiveConfirmed`, `updateSchoolConfirmed`, `updateStudentAdminConfirmed`.
