# Vroom QA, UX, Brand And Product Logic Report

Date: 2026-05-06
Project: `C:\Users\First\Desktop\DRIVING-SCHOOLS`
Scope: public landing, student entry, school page, booking flow, auth/registration, brand separation, visual system, wording, implementation roadmap.

## Executive Summary

The current product has a working core, but the entry logic is confused. `vroom.today` opens a page that looks like a mix of product hub, student entry, demo, and one real auto school. A user presses `Записаться`, lands on `Вираж`, books a lesson, and only after that sees account/registration logic. That is not just a design issue. It is a product positioning issue.

The root problem is that the app currently mixes three products in one visual and routing layer:

1. `vroom` as B2B platform for driving schools.
2. Public auto school pages used by real students.
3. Student account and booking flow.

These three should not have the same brand surface. The B2B platform can say `vroom`. The school admin and superadmin can say `vroom`. A real student booking a real lesson should mostly see the auto school brand, not `vroom`. If `vroom` appears in student pages, it should be a tiny infrastructure mark at most, for example `Работает на vroom`, and even that can be removed for white-label schools.

The strongest immediate fix is to split the entry model:

1. `/` becomes a clean B2B vroom landing/demo page for driving school owners, not a student chooser.
2. `/school/:slug` becomes white-label school landing, branded as the school.
3. `/school/:slug/book` becomes white-label booking, branded as the school.
4. `/student`, `/login`, `/student/register` become school-aware and avoid vroom branding for students.
5. `/demo` can open a clearly marked demo school, not silently `Вираж` without context.
6. Broken or misleading routes like `/auth` and `/admin` must be redirected or removed from visible UI.

## Current Evidence From Code

The audit is based on these files:

1. `src/App.tsx`
2. `src/pages/LandingPage.tsx`
3. `src/pages/SchoolPage.tsx`
4. `src/pages/BookingFlowPage.tsx`
5. `src/pages/StudentLoginPage.tsx`
6. `src/pages/StudentRegisterPage.tsx`
7. `src/components/product/CompactCards.tsx`
8. `src/index.css`
9. `tailwind.config.ts`
10. `README.md`
11. `PROJECT_BRIEF.md`

Logo assets found:

1. `hochuvodit/1/66e7a4f3-82ce-466e-ae2e-5bc02f6e5c66.png`
2. `hochuvodit/1/7d547400-47a9-4e36-a05d-c27c9b6397f6.png`

The model could not visually inspect the PNG contents, but the files exist and should be treated as the two official logo variants: dark-on-light and light-on-dark/inverted.

## Root Cause: Why Start Flow Feels Wrong

### Current Route Behavior

In `src/App.tsx`:

1. `/` renders `LandingPage`.
2. `/login` renders `StudentLoginPage`.
3. `/register` redirects to `/student/register`.
4. `/product` redirects to `/school/virazh`.
5. `/demo` redirects to `/school/virazh`.
6. `/school` redirects to `/school/virazh`.
7. `/school/:slug` renders `SchoolPage`.
8. `/school/:slug/book` renders `BookingFlowPage`.
9. `/student/register` renders `StudentRegisterPage`.
10. `/student/book` renders `BookingFlowPage`.
11. `/student` renders `StudentPage`.
12. `/auth` is not defined, so it becomes 404.
13. `/admin` is not defined, but `LandingPage` has an entry point that navigates to `/admin`.

### Why This Is Bad

The home page says `vroom`, but the first major action `Записаться` goes directly to `/school/virazh`. This makes `Вираж` look like the owner of the product or like a random default. The user has no context whether `Вираж` is a demo, a real client, or a required school. This is exactly why it feels like “какие-то ебанутые страницы автошколы какой-то непонятной”.

The second issue is sequence. The product currently encourages: choose school -> book -> register/create cabinet. That can be valid for low-friction booking, but only if the user already understands they are on a school page. When the journey starts at `vroom.today`, the user expects vroom product context first. Instead they see one school too early.

The third issue is hidden inconsistency. `/login` works, but `/auth` does not. If any marketing copy, memory, external link, or user intuition tries `/auth`, it fails. `/admin` from the home page is even worse: the UI shows `Для персонала`, but sends users to a route that is not registered. Real staff login is hidden behind `staff-entrance-73q`. That can be good for security by obscurity in MVP, but it must not be exposed as `/admin` if `/admin` 404s.

### Correct Product Logic

There must be two entry universes:

1. Vroom universe: owners, managers, admins, demos, sales, platform value.
2. School universe: students, school brand, schedule, instructors, booking, cabinet.

Students should not have to understand vroom. They should understand: “I am booking at my auto school.”

Driving school owners should understand vroom. They should see: “vroom helps my school receive bookings, manage schedule, instructors, students, and admin processes.”

## Highest Priority Problems

### P0: Homepage Sends Users To `Вираж` Without Context

Current problem: `LandingPage` entry point `Записаться` has `path: '/school/virazh'`. The default school quick card also opens the first active school or fallback `Вираж`.

Impact: user does not understand whether vroom is a marketplace, school, demo, admin panel, or student product.

Fix: homepage must not silently open a real/specific school. It should either show a clear demo CTA (`Посмотреть демо записи`) or B2B CTA (`Получить демо для автошколы`). If a school card appears, mark it as `Демо-автошкола`, not just `Вираж`.

### P0: Students See Vroom Branding Where They Should See School Branding

Current problem: `StudentLoginPage` and `StudentRegisterPage` show `vroom`, `вход ученика`, and `кабинет ученика`. The booking flow has neutral style but not strong school brand. The rule from the user is explicit: students should not see vroom.

Impact: white-label promise is broken. A student of an auto school does not know why vroom is involved. This reduces trust.

Fix: student pages must be school-aware. Header should show school logo/name. If no school context exists, show a neutral “кабинет ученика” selector or redirect to the last school. Vroom should remain only in admin/sales surfaces.

### P0: `/admin` Visible Entry Leads To 404

Current problem: `LandingPage` has `Для персонала` pointing to `/admin`. `App.tsx` has no `/admin` route. Staff login route is `ADMIN_LOGIN_PATH`, likely `/staff-entrance-73q`.

Impact: visible CTA is broken. This is a credibility killer.

Fix: either hide staff entry from public landing or navigate to the actual staff login path. If hidden URL strategy is intentional, do not show `Для персонала` on public homepage.

### P0: `/auth` Is Missing

Current problem: `/auth` is not routed. User already observed `/auth` 404.

Impact: common auth route fails.

Fix: add `/auth` redirect to `/login` or to a role chooser. If we split B2B/student, `/auth` should probably redirect to `/login` for students or `/staff-entrance-73q` only from admin context.

### P1: Registration Appears After Booking But Is Not Framed Clearly

Current problem: booking success has `В кабинет`, `Добавить в календарь`, `Записаться ещё`. The `account` step exists but is not reached from success in the current visible success block. There is a separate `BookingConfirmation` prompt `Создать кабинет?`.

Impact: account creation feels bolted on. The user may not know whether registration is required, optional, or already done.

Fix: choose one model:

1. No account required before booking. After success: `Создать кабинет, чтобы видеть записи` as secondary but clear CTA.
2. Account required before booking. Then login/register comes before slot confirmation.
3. Hybrid: guest booking first, optional account after, but consistently worded.

Recommendation: hybrid, because the target audience includes 40+ and low friction matters. But the school brand must lead.

## What Is Good Right Now

1. The product has real routes and a working core, not just mockups.
2. Booking slots are shown and can be refreshed.
3. The booking flow handles slot locks and late slot availability checks.
4. `BookingFlowPage` already supports quick booking from the date step.
5. `SchoolPage` shows school info, contacts, branches, instructors.
6. Typography is readable enough on mobile.
7. Target max width around `430px` is practical for student mobile flows.
8. Buttons are generally large enough for mobile.
9. Empty/error states exist via `StateView`.
10. There is a theme token system in `index.css`.
11. There are admin/superadmin surfaces and protected routes.
12. README and project brief document the current architecture honestly.
13. Instructor photos exist.
14. The booking flow updates public slots periodically.
15. The product already has a SaaS direction, even if the public entry is confused.

## What Feels Cheap Or Unfinished

1. Too much generic blue and grey.
2. The logo is not part of the visual system.
3. Homepage is more like a debug menu than a selling page.
4. `Выберите автошколу` on vroom homepage is misleading if vroom is not a marketplace.
5. `Открыть` on school card is weak and unclear.
6. `Для персонала` points to a dead route.
7. Student auth says `vroom`, violating white-label logic.
8. School page uses generic icon if no school logo and generic blocks.
9. Booking slots are all equal; no hierarchy or recommendation.
10. Text says `Нажмите свободный слот`, which sounds technical and not premium.
11. Day chips say `слотов`, a product/internal word. Better: `окон` or `времени`.
12. Some labels are too system-like: `Шаг 3 из 5`, `100%`.
13. There is no “best next step” on homepage.
14. There is no explanation what vroom does for a school owner.
15. There is no strong business promise: more bookings, fewer calls, live schedule, fewer mistakes.
16. The route structure exposes transitional product decisions.
17. The student flow lacks school-specific trust elements: license, real address, phone, instructor rating, car info priority.
18. The current design feels like a clean MVP, not a memorable brand.
19. Admin hidden URLs are okay internally, but public UI should not leak broken admin intentions.
20. Dark mode toggle appears on public school pages; for 40+ student booking this may be unnecessary noise.

## Brand Strategy

### Brand Separation Rule

Vroom is the platform. Auto school is the customer-facing brand for students.

Use `vroom` on:

1. B2B landing.
2. Superadmin.
3. Internal platform documentation.
4. Sales/demo mode.
5. Admin login if the school owner is logging into the vroom platform.
6. Admin panel header, possibly `vroom для автошколы`.

Do not use prominent `vroom` on:

1. Public school landing for students.
2. Student booking flow.
3. Student login.
4. Student registration.
5. Booking confirmation.
6. Student cabinet.

Optional tiny mark:

1. Footer `Онлайн-запись работает на vroom` only if acceptable.
2. Can be disabled per school for white-label plan.

### Vroom Brand Personality

Vroom should not be another blue SaaS. It should feel fast, direct, operational, confident, and slightly automotive.

Brand words:

1. Fast.
2. Clear.
3. Controlled.
4. Practical.
5. Modern.
6. Not childish.
7. Not taxi-app yellow-black cliché.
8. Not bank-blue generic.

Tone:

1. Short sentences.
2. Concrete business outcomes.
3. No startup fluff.
4. No “инновационная платформа”.
5. No “экосистема”.
6. Say what it does: schedule, booking, students, instructors, reminders, admin.

### Proposed Core Message

For school owners:

`vroom убирает звонки из записи на вождение`

Supporting line:

`Ученики выбирают свободное окно сами. Администратор видит расписание, инструкторов, записи и изменения в одном кабинете.`

Alternative:

`Онлайн-запись и расписание для автошкол`

Supporting line:

`Без таблиц, переписок и ручной сверки свободных окон.`

### Student-Facing Message

For school pages:

`Запись на практику в автошколе «Вираж»`

Supporting line:

`Выберите день, инструктора и удобное время. Подтверждение займет пару минут.`

Do not say:

1. `vroom` prominently.
2. `Выберите автошколу` unless this is truly a marketplace.
3. `Сервис vroom` in student header.

## Visual Identity Direction

### Recommended Direction: Graphite + Signal Lime + Warm White

This direction makes vroom less generic than blue SaaS and ties it to speed/road/signals without using obvious traffic clichés.

Palette:

1. Graphite: `#0B0F14`
2. Asphalt: `#151B22`
3. Warm white: `#F6F2EA`
4. Clean white: `#FFFFFF`
5. Signal lime: `#C7FF3D`
6. Electric blue secondary: `#355CFF`
7. Muted grey: `#8B929C`
8. Road line: `#D7D0C4`
9. Error red: `#EF4444`
10. Success green: `#16A34A`

Why:

1. Graphite makes the logo stronger.
2. Signal lime creates recognizable accent distinct from generic blue.
3. Warm white avoids sterile grey.
4. Blue remains as secondary utility, not primary brand.

### Alternative Direction: Black + Racing Cream + Orange

Palette:

1. Black: `#050607`
2. Cream: `#FFF4DF`
3. Orange: `#FF7A1A`
4. Red-orange: `#FF3D2E`
5. Grey: `#717780`

Pros:

1. More emotional.
2. Strong automotive feeling.
3. Good for marketing.

Cons:

1. Can become taxi/racing cliché.
2. Less calm for 40+ users.
3. Needs careful contrast work.

### Alternative Direction: Deep Navy + Mint + White

Palette:

1. Navy: `#0A1020`
2. Blue: `#2436D9`
3. Mint: `#34F5A6`
4. White: `#FFFFFF`
5. Cool grey: `#EEF2F6`

Pros:

1. Closest to current implementation.
2. Easy migration.
3. Trustworthy SaaS look.

Cons:

1. Still feels generic.
2. Weak differentiation.
3. Existing blue already feels standard.

Recommendation: use Graphite + Signal Lime + Warm White for vroom platform. For student school pages, allow school theming but keep booking UX structure consistent.

## Logo Integration Plan

### Asset Placement

Copy logo variants from:

1. `hochuvodit/1/66e7a4f3-82ce-466e-ae2e-5bc02f6e5c66.png`
2. `hochuvodit/1/7d547400-47a9-4e36-a05d-c27c9b6397f6.png`

To:

1. `public/brand/vroom-logo-dark.png`
2. `public/brand/vroom-logo-light.png`

Exact mapping should be verified visually once image support/browser preview is available. If one is black-on-white, use it for light surfaces. If one is white-on-black or inverted, use it for dark hero/admin surfaces.

### Where To Use Vroom Logo

Use prominent vroom logo in:

1. B2B homepage header.
2. B2B homepage hero.
3. Staff login page.
4. Superadmin login page.
5. Admin layout small header.
6. Superadmin layout.
7. PDF/export/report templates if added later.

Use tiny or no vroom logo in:

1. Public school page.
2. Booking flow.
3. Student cabinet.
4. Student login/register.

### Logo Treatment

1. Do not put logo inside random rounded square if the logo already includes its own mark.
2. Keep clear space equal to at least 0.5x logo height.
3. Use monochrome logo on strong brand surfaces.
4. Avoid mixing logo with current blue icon button.
5. The speed lines can become a recurring graphic motif: separators, hero background streaks, progress indicators.

## Homepage Redesign Plan

### Current Homepage Problem

Current homepage says `Выберите автошколу`, shows entry points, and has `Вираж` as default. It is neither a sales page nor a student entry page.

### New Homepage Role

`/` should sell vroom to auto school owners.

Primary audience:

1. Owner of driving school.
2. Administrator/manager.
3. Operator evaluating the product.

Not primary audience:

1. Student trying to book a lesson.

### New Homepage Structure

1. Header: vroom logo, `Для автошкол`, `Возможности`, `Демо`, `Войти`.
2. Hero: strong headline, short proof, CTA.
3. Product preview: schedule/booking/admin cards.
4. Problem section: calls, Excel, double bookings, lost messages.
5. Solution section: online booking, live slots, instructor schedules, student cabinet.
6. Demo block: clearly marked `Демо автошколы`.
7. Pricing/offer placeholder if price exists; if no price, use `Запросить запуск`.
8. FAQ for owners.
9. Footer: contacts/legal.

### Homepage Copy

Hero headline:

`Онлайн-запись на вождение для автошкол`

Hero stronger variant:

`Ученики записываются сами. Администратор видит всё расписание.`

Subheadline:

`vroom показывает свободные окна, инструкторов и филиалы. Заявки попадают в кабинет автошколы без звонков, таблиц и ручной сверки.`

Primary CTA:

`Посмотреть демо`

Secondary CTA:

`Войти для автошколы`

Demo disclaimer:

`Демо открывает тестовую автошколу. Это пример ученического сценария.`

Do not use:

1. `Выберите автошколу` on vroom homepage.
2. `Записаться` as main CTA on vroom homepage unless clearly labelled as demo.
3. A naked `Вираж` card.

## School Page Redesign Plan

### Current Problem

`SchoolPage` is functional but generic. It looks like a profile card, not a confident school booking entry. It also has `Вернуться в кабинет`, which is wrong for a public school page reached from a link or demo.

### Correct Role

`/school/:slug` is a school-owned page for students. It should answer:

1. Where am I?
2. Is this my school?
3. Can I trust this page?
4. What action should I take?
5. What happens after I book?

### New School Page Structure

1. Header with school logo/name, not vroom.
2. Hero: `Запись на практику` + school name.
3. Primary CTA: `Выбрать время`.
4. Trust strip: phone, address, categories, number of instructors.
5. Instructor preview: 3-5 instructors with car/transmission, photo, next available window.
6. Branch info if multiple branches.
7. FAQ: `Нужен ли кабинет?`, `Можно ли перенести?`, `Кто подтвердит запись?`.
8. Sticky mobile CTA.

### Specific Fixes

1. Replace top button `Вернуться в кабинет` with context-aware action.
2. If user came from student cabinet, show `В кабинет`.
3. If user came directly, show no back button or show `Позвонить`.
4. Remove theme toggle from primary student flow unless settings require it.
5. Make school logo larger and more meaningful.
6. Show school phone as a support fallback near CTA.
7. Change `Автошкола` eyebrow to `Онлайн-запись` or remove.

### Better Wording

Current: `Записаться на занятие`
Better: `Выбрать время практики`

Current: `Информация об автошколе, филиалах и контактах для учеников.`
Better: `Выберите удобное время практического занятия. Если возникнут вопросы, администратор автошколы свяжется с вами.`

Current: `Вернуться в кабинет`
Better direct public state: `Позвонить в автошколу` or no button.

## Booking Flow Redesign Plan

### Current Strength

The booking flow has a practical quick-book model. It shows dates, slots, instructors, contact fields, confirmation, and success.

### Current Problems

1. Too many slots can appear at once.
2. Slots have equal hierarchy.
3. No `best option` logic.
4. Slot labels feel technical.
5. Grey/blue palette makes it look like a generic app.
6. It can show `Подтвердить запись` inside a slot card before contact data exists, which can feel premature.
7. Progress appears only after date step, so the flow starts as one model and then becomes a wizard.
8. `Выбрать по инструктору` is a secondary path, but it may be more important for many students.
9. There is no branch selector upfront if school has multiple branches.
10. Contact step asks `Email, если понадобится`, vague and unnecessary for many users.

### Recommended Booking Model

Use a guided but fast flow:

1. Choose branch/category if needed.
2. Show recommended 5 windows.
3. Let user expand more windows.
4. Choose instructor/time.
5. Enter name and phone.
6. Confirm.
7. Success with optional cabinet creation.

### Recommended Slot Display

Default should show 5 best options:

1. Earliest today.
2. Earliest tomorrow.
3. Best-rated instructor next slot.
4. Closest branch next slot.
5. Evening/weekend slot if available.

Then button:

`Показать все времена на этот день`

### Slot Card Improvements

Each recommended slot card should show:

1. Time large.
2. Day/date.
3. Instructor name.
4. Car and transmission.
5. Branch.
6. Badge: `Ближайшее`, `Удобно вечером`, `Популярный инструктор`, or `Рядом`.
7. CTA: `Выбрать это время`.

### Instructor Rating

Do not fake ratings unless data exists. If no real rating, use truthful operational indicators:

1. `Есть окна сегодня`.
2. `Автомат` / `Механика`.
3. `Категория B`.
4. `Филиал Северный`.
5. `Следующее окно 16:00`.

If ratings are added later, they must come from real feedback.

### Contact Step

Current: `Ваши контакты`, `Имя и телефон нужны для записи.`

Better:

`Кому записать занятие?`

`Автошкола увидит имя и телефон в расписании.`

Fields:

1. `Имя и фамилия`
2. `Телефон`
3. Optional email hidden behind `Добавить email`.

### Success Step

Current: `Мы сохранили запись. Если нужно, автошкола свяжется с вами.`

Better:

`Запись создана`

`Автошкола «Вираж» увидит вашу запись в расписании. Если нужно уточнение, администратор позвонит.`

Buttons:

1. `Открыть детали записи`
2. `Добавить в календарь`
3. `Создать кабинет ученика`
4. `Записаться ещё`

## Student Login And Registration

### Current Problem

`StudentLoginPage` and `StudentRegisterPage` show vroom. This breaks the rule that students should not see vroom.

### Correct Model

Student auth must be school-scoped.

Possible routes:

1. `/school/:slug/login`
2. `/school/:slug/register`
3. `/school/:slug/student`
4. `/student` redirects to last used school cabinet if known.

If keeping current routes for compatibility:

1. `/login` should detect last school and show its brand.
2. If no last school, show neutral copy: `Вход в кабинет ученика` and ask for phone.
3. Do not show vroom logo.

### Registration Sequence

The current step-by-step registration is readable but too long if it appears before value. It asks last name, first name, middle name, phone, password. For a 40+ audience, this can work, but only when the user expects registration.

Recommendation:

1. For first booking: ask only name and phone.
2. After booking: offer cabinet creation with password.
3. Full profile details can be completed in cabinet.

### Better Registration Wording

Current: `Начнём с короткой регистрации ученика.`
Better: `Создадим кабинет, чтобы вы видели свои записи.`

Current: `Он нужен автошколе для записи на занятие и входа в кабинет.`
Better: `На этот номер автошкола сможет позвонить по записи. Он же будет логином для кабинета.`

Current: `Пароль для входа`
Better: `Придумайте пароль для кабинета`

## Admin And Staff Entry

### Current Problem

Visible `Для персонала` points to `/admin`, but real route is hidden.

### Correct Model

If vroom is SaaS, staff entry can be visible as `Войти для автошколы`, but it must go to a real route. Hidden URL strategy should not be linked from a public page.

Options:

1. Make `/admin` redirect to actual staff login.
2. Remove `Для персонала` from public home and keep hidden links only.
3. Create `/owners/login` or `/school-admin/login` and use that as official login.

Recommendation: create official B2B staff login route `/login/school` or `/staff/login`, then keep hidden legacy path as redirect or internal access.

## Typography Audit

### Current State

The app uses `Manrope` in CSS and Tailwind config. Manrope is readable and modern, but it does not create a distinct brand alone. Many headings are heavy and tightly tracked. This works on mobile, but the system lacks typographic hierarchy between platform, school, booking, and admin contexts.

### Problems

1. Headings often use `font-black` or `font-bold` everywhere, reducing hierarchy.
2. Micro labels are uppercase in some places, normal in others.
3. Numbers are not consistently emphasized.
4. Slot times are readable but not visually premium.
5. Body copy is often `font-semibold`, making paragraphs too dense.

### Recommendation

Keep Manrope for speed. Add a stricter scale:

1. Platform hero: 56-72 px desktop, 38-44 px mobile, weight 900.
2. Student screen title: 28-34 px, weight 800.
3. Card title: 16-18 px, weight 800.
4. Body: 15-16 px, weight 500.
5. Helper: 13-14 px, weight 500-600.
6. Micro: 11-12 px, weight 700, limited uppercase.
7. Slot time: 24-30 px, tabular numbers if possible.

Add CSS:

1. `font-variant-numeric: tabular-nums;` for slot times and stats.
2. Avoid uppercase for Russian labels unless very short.

## Color Audit

### Current State

Core tokens:

1. `--page-bg: #F2F3F4`
2. `--surface: #FFFFFF`
3. `--accent: #2436D9`
4. `--accent-soft: rgba(36, 54, 217, 0.10)`
5. `--text: #111418`
6. `--text-muted: #6F747A`

### Problems

1. The blue is generic SaaS.
2. The grey background looks utilitarian but not branded.
3. Green only appears as status, not brand.
4. There is no strong accent for “speed” or “recommendation”.
5. Logo black/white has no relationship to blue.

### Recommendation

For vroom platform:

1. Use graphite as primary.
2. Use signal lime for CTA and highlights.
3. Use warm white background.
4. Keep blue only for links/info states.

For school pages:

1. Use school theme if available.
2. If no theme, use neutral white-label palette.
3. Keep CTA high-contrast and accessible.

## Component-Level QA Notes

### `LandingPage.tsx`

Problems:

1. `entryPoints` combines student booking, student cabinet, and staff admin.
2. `Записаться` points to `/school/virazh`.
3. `Для персонала` points to `/admin`, which is not routed.
4. Header uses generic inline SVG instead of supplied logo.
5. Footer says `Выберите школу на её странице, чтобы записаться`, confusing.
6. Default school card fallback creates fake certainty around `Вираж`.
7. No price, no offer, no demo explanation.

Fix:

1. Convert to B2B landing.
2. Add supplied vroom logo.
3. Replace entry cards with product value cards.
4. Make demo explicit.
5. Route staff login correctly.

### `SchoolPage.tsx`

Problems:

1. Public school page assumes return to cabinet.
2. Theme toggle is unnecessary in a high-conversion student flow.
3. CTA is duplicated but not sticky.
4. Instructor cards lack photos despite photo service existing elsewhere.
5. No immediate “next available times”.
6. Contacts section may repeat data from hero.
7. `Автошкола` eyebrow is obvious and not useful.

Fix:

1. Header school-branded.
2. Context-aware back action.
3. Add next available slots preview.
4. Use instructor photos.
5. Sticky CTA on mobile.
6. Remove or hide theme toggle.

### `BookingFlowPage.tsx`

Problems:

1. File is 1090 lines and does too much.
2. `Step` includes `account`, but visible success flow does not strongly route into it.
3. Quick booking and wizard booking are mixed.
4. `slotsForSelectedDate` shows every slot, not curated top options.
5. `slotsForSelection` does not depend on `slotsVersion`, so refresh changes may not always recompute when selected instructor/date is unchanged.
6. `document.addEventListener('visibilitychange', onFocus)` calls refresh on every visibility change, including hidden; better check visibility state.
7. `FastSlotCard` has hardcoded `#2436D9`, bypassing tokens.
8. `submitting && selected ? 'Записываем...' : selected ? 'Подтвердить запись' : 'Записаться'` can make a slot card look like final confirmation too early.
9. `selectedSlot` is read from `db.slots.byId(selectedSlotId)`, which can become stale after refresh unless carefully synchronized.
10. `createAccount` saves `categoryCodes: ['B']` hardcoded.

Fix:

1. Extract recommendation logic.
2. Add school-branded header.
3. Replace hardcoded blue with tokens.
4. Add curated 5-slot mode.
5. Make account creation explicitly optional after success.
6. Include `slotsVersion` in `slotsForSelection` dependencies.
7. Only refresh on visibility when document becomes visible.
8. Avoid hardcoded category B; use selected school/category.

### `StudentLoginPage.tsx`

Problems:

1. Shows vroom to students.
2. Hardcodes `school-virazh` in Supabase login.
3. Header navigates to `/` which is platform landing, not necessarily school context.
4. `Регистрация` routes to global `/student/register`.
5. Password recovery says “скоро появится”; acceptable for MVP but weak.

Fix:

1. Make school-aware.
2. Remove vroom logo.
3. Use school logo/name.
4. Store last school slug after booking/school visit.
5. Route registration to school-scoped registration.

### `StudentRegisterPage.tsx`

Problems:

1. Shows vroom to students.
2. Hardcodes school `virazh`.
3. Full registration before context can feel heavy.
4. Uses `localStorage.removeItem(draftKey)` and `sessionStorage.removeItem(draftKey)` correctly, but draft key is global, not school-scoped.
5. `existingProfile` can change the CTA logic but not enough context is shown.

Fix:

1. Make school-aware.
2. Scope draft key by school.
3. Offer registration after booking as optional.
4. Use school brand.
5. Reduce initial registration fields if used before booking.

### `CompactCards.tsx`

Problems:

1. Day chips say `слотов`.
2. Time slot grid is functional but not distinctive.
3. Instructor card has no rating/trust substitute.
4. Uses current blue tokens heavily.

Fix:

1. Change `слотов` to `окон`.
2. Add recommendation badges.
3. Add truthful availability labels.
4. Use tokenized vroom/school palettes.

## Information Architecture

### Recommended Routes

Platform:

1. `/` vroom B2B landing.
2. `/demo` vroom demo selector or demo explanation.
3. `/demo/student` redirects to `/school/demo/book` or `/school/virazh?demo=1` with visible demo label.
4. `/login/school` staff login.
5. `/login/root` superadmin login.

School public:

1. `/school/:slug` school page.
2. `/school/:slug/book` booking.
3. `/school/:slug/login` student login.
4. `/school/:slug/register` student registration.
5. `/school/:slug/student` student cabinet.

Compatibility redirects:

1. `/auth` -> `/login` or role chooser.
2. `/login` -> last school login if known, otherwise neutral student login.
3. `/student` -> last school student cabinet or phone login.
4. `/student/register` -> last school register or neutral.
5. `/admin` -> `/login/school` if public staff login is allowed.

## Copy And Wording Problems

### Replace These

`Выберите автошколу`
Use on marketplace only. For vroom B2B, replace with `Онлайн-запись для автошкол`.

`Записаться`
On vroom homepage, replace with `Посмотреть демо записи`. On school pages, use `Выбрать время`.

`Открыть`
Replace with `Открыть демо` or `Перейти к записи` depending context.

`Для персонала`
Replace with `Войти для автошколы` and route correctly.

`слоты`
Replace with `окна`, `время`, or `свободные времена` for students.

`кабинет ученика` under vroom logo
Replace with school name or neutral `Кабинет ученика` without vroom.

`Телефон или пароль не совпадают`
Better: `Не получилось войти. Проверьте телефон и пароль. Если кабинета ещё нет, создайте его после записи или обратитесь в автошколу.`

`Восстановление пароля скоро появится`
Better: `Чтобы восстановить доступ, обратитесь в автошколу. Онлайн-восстановление добавим позже.`

## UX Principles For The Next Version

1. One screen, one main action.
2. Students see school brand first.
3. Vroom brand belongs to B2B/admin surfaces.
4. No fake ratings or fake progress.
5. No internal words like `слот` in student-facing primary copy.
6. If something is demo, say demo.
7. If something is hidden/internal, do not link to a dead public route.
8. Booking should work without account creation.
9. Account creation should explain benefit.
10. Staff login should never 404 from a visible CTA.
11. CTA labels must describe outcome, not generic action.
12. Use brand color intentionally, not everywhere.
13. Show fewer choices by default.
14. Allow expansion for power users.
15. Keep mobile-first readability.

## Proposed Design System

### Tokens

Vroom platform tokens:

1. `--vroom-bg: #F6F2EA`
2. `--vroom-ink: #0B0F14`
3. `--vroom-surface: #FFFFFF`
4. `--vroom-surface-alt: #ECE6DA`
5. `--vroom-accent: #C7FF3D`
6. `--vroom-accent-ink: #0B0F14`
7. `--vroom-blue: #355CFF`
8. `--vroom-muted: #6F7782`
9. `--vroom-border: rgba(11, 15, 20, 0.10)`
10. `--vroom-shadow: 0 24px 70px rgba(11, 15, 20, 0.16)`

School default tokens:

1. `--school-bg: #F7F7F4`
2. `--school-ink: #111418`
3. `--school-surface: #FFFFFF`
4. `--school-accent: school theme or #111418`
5. `--school-accent-soft: rgba(17, 20, 24, 0.08)`
6. `--school-muted: #6F747A`
7. `--school-border: rgba(0, 0, 0, 0.08)`

### Components

Vroom B2B components:

1. `VroomLogo`
2. `PlatformHeader`
3. `HeroProofCard`
4. `ProductPreviewCard`
5. `MetricStrip`
6. `ProblemCard`
7. `DemoSchoolCard`

School/student components:

1. `SchoolBrandHeader`
2. `SchoolHeroCard`
3. `BookingRecommendationList`
4. `RecommendedSlotCard`
5. `SchoolInstructorCard`
6. `StudentAuthShell`
7. `OptionalAccountPrompt`
8. `PoweredByVroomFooter` optional.

## Implementation Roadmap

### Phase 1: Fix Broken Logic And Branding Boundaries

Goal: stop the embarrassing entry confusion.

Tasks:

1. Add `/auth` redirect.
2. Fix `/admin` visible route or remove public staff entry.
3. Change `/` from student/school chooser to vroom platform landing.
4. Make `/demo` explicitly demo.
5. Add `public/brand` logo files.
6. Use vroom logo on platform landing and staff/admin surfaces.
7. Remove prominent vroom branding from student login/register.
8. Store last school slug after visiting school page or booking.
9. Make student login/register use school brand when school context exists.

Acceptance:

1. Opening `vroom.today` no longer immediately implies `Вираж` is the product.
2. `/auth` does not 404.
3. `/admin` from visible UI does not 404.
4. Student booking pages do not show vroom prominently.

### Phase 2: Redesign Homepage

Goal: make vroom sellable to auto school owners.

Tasks:

1. Replace current entry cards.
2. Add B2B hero.
3. Add product preview sections.
4. Add explicit demo CTA.
5. Add business benefit copy.
6. Add logo asset.
7. Apply graphite/lime/warm palette.
8. Make desktop and mobile responsive.

Acceptance:

1. User understands vroom is SaaS for driving schools in 5 seconds.
2. Demo is labelled as demo.
3. There is no unexplained `Вираж` card.

### Phase 3: Redesign School Page

Goal: make school page trustworthy and white-label.

Tasks:

1. Add `SchoolBrandHeader`.
2. Remove or contextualize `Вернуться в кабинет`.
3. Add school-specific hero copy.
4. Add sticky CTA.
5. Add instructor photo cards.
6. Add next available windows preview.
7. Add support phone.
8. Add optional `Работает на vroom` footer toggle.

Acceptance:

1. Student sees auto school, not vroom.
2. Booking CTA is obvious.
3. Page explains what happens next.

### Phase 4: Booking Recommendations

Goal: reduce choice overload.

Tasks:

1. Add recommendation function for top 5 slots.
2. Add badges for truthful slot qualities.
3. Show top 5 by default.
4. Add `Показать все времена` expansion.
5. Replace `слоты` wording.
6. Add instructor/car/branch hierarchy.
7. Remove hardcoded blue from slot CTA.

Acceptance:

1. Default booking screen is not a wall of identical cards.
2. The best next options are visually obvious.
3. No fake rating data is introduced.

### Phase 5: Student Account Flow

Goal: registration no longer feels backwards.

Tasks:

1. Keep guest booking first.
2. After success, show optional account creation with clear benefit.
3. School-scope account creation.
4. Reduce pre-booking registration fields.
5. Fix hardcoded `school-virazh` in login.
6. Scope draft keys by school.
7. Add account creation prompt on confirmation page.

Acceptance:

1. Booking works without forced registration.
2. Account creation feels useful, not mandatory.
3. Student auth uses school context.

### Phase 6: QA And Smoke Tests

Goal: avoid regressions on launch.

Tasks:

1. Add route smoke for `/`, `/demo`, `/auth`, `/login`, `/school/virazh`, `/school/virazh/book`.
2. Add public booking smoke.
3. Add staff login route smoke.
4. Add student login/register smoke.
5. Verify mobile viewport.
6. Verify desktop viewport.
7. Verify no visible CTA points to 404.

Acceptance:

1. `npm run typecheck` passes.
2. `npm run build` passes.
3. Smoke catches broken public routes.

## Immediate Fix List

1. Add `/auth` route redirect to `/login`.
2. Change `LandingPage` `Для персонала` path from `/admin` to actual staff login path or remove it.
3. Change `LandingPage` `Записаться` to `Посмотреть демо записи`.
4. Add visible `Демо` label before opening `Вираж`.
5. Copy logos to `public/brand`.
6. Replace inline SVG vroom icon on platform surfaces with real logo.
7. Remove vroom logo/name from `StudentLoginPage` and `StudentRegisterPage`.
8. Replace `Выберите автошколу` with platform headline.
9. Replace `слотов` with `окон` in student-facing chips.
10. Replace hardcoded `#2436D9` in `FastSlotCard` with token.
11. Include `slotsVersion` in `slotsForSelection` dependencies.
12. Make `/demo` not silently redirect without explanation.
13. Make `/school` redirect only if this is intended; otherwise route to a branded 404/explanation.
14. Add school-scoped login routes.
15. Add last school slug persistence.

## Suggested New Homepage Wireframe In Text

Header:

`[vroom logo] Для автошкол  Возможности  Демо  [Войти]`

Hero:

`Ученики записываются сами. Автошкола видит всё расписание.`

`Онлайн-запись, инструкторы, филиалы, свободные окна и кабинет ученика в одном продукте.`

Buttons:

`Посмотреть демо` and `Войти для автошколы`

Proof cards:

1. `Свободные окна без звонков`
2. `Расписание инструкторов`
3. `Записи и ученики в кабинете`

Demo block:

`Демо ученической записи`

`Откроется тестовая автошкола. Так ученик видит выбор времени.`

Button:

`Открыть демо`

## Suggested School Page Wireframe In Text

Header:

`[school logo] Автошкола Вираж    [Позвонить]`

Hero card:

`Запись на практику`

`Выберите удобное время занятия в автошколе «Вираж».`

Primary CTA:

`Выбрать время`

Trust strip:

`3 филиала` `8 инструкторов` `Категория B` `Есть окна сегодня`

Recommended windows:

`Сегодня 16:00 · Петров · Hyundai Solaris · Северный филиал`

Button:

`Выбрать это время`

Footer:

`Если не нашли удобное время, позвоните администратору.`

## Suggested Booking Screen Wireframe In Text

Header:

`[school logo] Запись в Вираж`

Title:

`Выберите время практики`

Subtitle:

`Показываем ближайшие свободные окна. Все данные попадут администратору автошколы.`

Recommended section:

`Лучшие варианты`

Cards:

1. `Сегодня 16:00` badge `Ближайшее`
2. `Завтра 10:00` badge `Утро`
3. `Пт 18:30` badge `После работы`
4. `Сб 12:00` badge `Выходной`
5. `Сегодня 19:00` badge `Вечер`

Secondary:

`Показать все времена на 6 мая`

Contact step:

`Кому записать занятие?`

`Автошкола увидит эти данные в расписании.`

Confirm:

`Проверьте запись`

Success:

`Запись создана`

`Создать кабинет, чтобы видеть записи и быстрее записываться снова.`

## Design QA Checklist For Future Review

1. Does the screen show vroom only where vroom is the product?
2. Does a student screen show school name/logo first?
3. Is there one obvious CTA?
4. Does every CTA route to a real page?
5. Is demo content labelled as demo?
6. Are there fewer than 7 choices visible by default?
7. Are times large enough?
8. Are phone/contact fallback options visible?
9. Is copy written for a normal person, not for developers?
10. Are colors part of a system, not random inline values?
11. Is the logo used consistently?
12. Are fake ratings avoided?
13. Is registration optional unless absolutely required?
14. Does the page work on 360px mobile width?
15. Does the page work on desktop without looking like a stretched mobile app?
16. Does dark mode create value, or just noise?
17. Are legal links present where account/password is created?
18. Are errors human and specific?
19. Is the route understandable from URL alone?
20. Can a non-technical owner explain what vroom does after seeing homepage?

## Final Recommendation

Do not start by polishing every card. Start by fixing the product boundary. Right now the worst problem is not that cards are grey. The worst problem is that `vroom.today` does not know whether it is a SaaS landing page, a school directory, a demo, or the entrance to `Вираж`.

The fastest path to a better product is:

1. Make `/` a real vroom B2B page.
2. Make `/school/:slug` and booking white-label school pages.
3. Fix broken visible routes.
4. Add the supplied logo to vroom surfaces.
5. Replace generic blue with a real vroom palette.
6. Reduce booking choices to recommended windows.
7. Make registration optional after booking.

This will immediately make the product feel intentional instead of accidental.
