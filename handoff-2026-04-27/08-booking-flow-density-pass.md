# UX Density Pass 2 — Booking Flow & SchoolPage — 2026-04-28

## Статус

- `npm run typecheck` — ✅ чисто
- `npm run build` — ✅ чисто
- `git commit` — ✅ закоммичено (`c209677`)

---

## Что сделали в этой итерации

Второй проход по плотности. Первый проход (07-ux-density-pass.md) уже уплотнил примитивы и общие страницы. Этот проход добил booking flow и оставшиеся секции SchoolPage.

### 1. Booking flow — все 8 шагов (SchoolPage.tsx)

Файл: `src/pages/SchoolPage.tsx`

Контейнер записи:
- `rounded-[28px]` → `rounded-2xl`
- `p-5` → `px-5 py-4`

**Шаг category:**
- h1: `text-2xl font-semibold` → `text-base font-bold`
- описание: `text-base text-stone-600` → `text-xs text-stone-400`
- кнопки категорий: `rounded-2xl p-4` → `rounded-xl px-3 py-2.5`
- код категории: `text-xl font-semibold` → `text-sm font-bold`
- название: `text-sm` → `text-[11px]`
- «Пропустить»: убраны `size="lg" min-h-12 text-base`

**Шаг branch:**
- h1: `text-2xl` → `text-base font-bold`
- карточки: `rounded-2xl p-4` → `rounded-xl px-4 py-3`
- название: `text-lg font-semibold` → `text-sm font-semibold`
- адрес: `text-base` → `text-xs`

**Шаг instructor:**
- h1: `text-2xl` → `text-base font-bold`
- Avatar: `size="lg"` → `size="md"`
- имя: `text-lg font-semibold` → `text-sm font-semibold`
- машина: `text-base` → `text-xs text-stone-500`
- категории: `text-sm` → `text-xs text-stone-400`

**Шаг date:**
- h1: `text-2xl` → `text-base font-bold`
- карточки дат: `rounded-2xl p-4` → `rounded-xl px-4 py-3`
- день: `text-lg font-semibold` → `text-sm font-semibold`
- количество слотов: `text-base text-stone-500` → `text-xs text-stone-400`
- CTA: убран `mt-5 min-h-14 text-lg`

**Шаг time:**
- h1: `text-2xl` → `text-base font-bold`
- описание: `text-base` → `text-xs text-stone-400`
- группа дня: `rounded-3xl p-3` → `rounded-xl p-2.5`
- метка дня: `text-base font-semibold` → `text-[11px] uppercase tracking-wider`
- карточки слотов: `min-h-[104px] w-[128px] rounded-2xl p-4` → `min-h-[76px] w-[96px] rounded-lg px-3 py-2`
- время: `text-2xl font-semibold` → `text-base font-bold`
- длительность: `text-xs` → `text-[10px] opacity-80`

**Шаг details:**
- h1: `text-2xl` → `text-base font-bold`
- описание: `text-base` → `text-xs text-stone-400`
- отступы: `mt-5 space-y-4` → `mt-4 space-y-3`

**Шаг review:**
- h1: `text-2xl` → `text-base font-bold`
- карточки слотов: `rounded-2xl p-4` → `rounded-xl px-4 py-3`
- время слота: `text-lg font-semibold` → `text-sm font-semibold`
- детали слота: `text-base text-stone-600` → `text-xs text-stone-500`
- блок ученика: `p-4 rounded-2xl` → `px-4 py-3 rounded-xl`
- имя: `text-base font-semibold` → `text-sm font-semibold`
- телефон: `text-base text-stone-600` → `text-xs text-stone-400`
- Check icon: `size={18}` → `size={15}`

**Шаг profile (успех):**
- иконка: `h-16 w-16 rounded-2xl` → `h-12 w-12 rounded-xl`
- CheckCircle2: `size={32}` → `size={24}`
- h1: `mt-5 text-2xl font-semibold` → `mt-4 text-base font-bold`
- описание: `text-base leading-relaxed` → `text-xs leading-relaxed text-stone-400`
- поля: `mt-6 space-y-4` → `mt-4 space-y-3`
- CTA: убраны `min-h-14 text-lg` / `min-h-12 text-base`

---

### 2. SchoolPage — основные секции

**SchoolHome (главная карточка):**
- `rounded-[28px] p-5` → `rounded-2xl px-5 py-4`
- «Автошкола»: `text-base font-medium text-stone-500` → `text-xs font-medium text-stone-400 uppercase tracking-wide`
- h1: `text-3xl font-semibold` → `text-xl font-bold`
- описание: `text-lg leading-relaxed text-stone-600` → `text-sm leading-relaxed text-stone-500`
- кнопки: убраны `min-h-14 text-lg` / `min-h-12 text-base`

**Статистика (3 карточки):**
- `grid gap-3 sm:grid-cols-3` → `grid grid-cols-3 gap-2`
- карточки: `p-4` → `px-3 py-3 text-center`
- число: `text-2xl font-semibold` → `text-lg font-bold tabular-nums`
- подпись: `text-sm text-stone-500` → `text-[11px] text-stone-400`

**Категории:**
- `rounded-[28px] p-5` → `rounded-2xl px-5 py-4`
- заголовок: `text-xl font-semibold` → `text-sm font-bold`
- описание убрано
- кнопки: `px-4 py-4` → `px-3 py-2.5`
- код: `text-lg font-semibold` → `text-sm font-bold`
- название: `text-sm` → `text-[11px]`

**Инструкторы:**
- `rounded-[28px] p-5` → `rounded-2xl px-5 py-4`
- заголовок: `text-xl` → `text-sm font-bold`
- описание убрано
- карточки: `p-4 gap-4` → `px-4 py-3 gap-3`
- Avatar: `size="lg"` → `size="md"`
- имя: `text-base font-semibold` → `text-sm font-semibold`
- машина/категории/филиал: `text-sm` → `text-xs text-stone-400`

**Филиалы:**
- `rounded-[28px] p-5` → `rounded-2xl px-5 py-4`
- заголовок: `text-xl` → `text-sm font-bold`
- карточки: `rounded-2xl p-4` → `rounded-xl px-4 py-3`
- название: `text-base font-semibold` → `text-sm font-semibold`
- адрес: `text-base text-stone-600` → `text-xs text-stone-500`

---

### 3. StudentDashboard

- `rounded-[24px] p-4` → `rounded-2xl p-4`
- аватар: `h-16 w-16 rounded-2xl text-lg` → `h-10 w-10 rounded-xl text-sm`
- метка роли: `text-[11px] uppercase tracking-wide text-stone-400`
- имя: `text-xl font-semibold` → `text-base font-bold`
- адрес/контакт: `text-sm text-stone-600` → `text-xs text-stone-400`
- иконки настроек/выхода: `h-9.5 w-9.5` → `h-8 w-8`, icon `size={14}`
- «Ближайшее занятие»: `text-lg font-semibold` → `text-sm font-bold`
- детали занятия: `text-sm text-stone-600` → `text-xs text-stone-500`
- кнопка «Расписание»: было «Все слоты», убран `size="lg"` у secondary
- «Мои записи»: `text-base font-semibold` → `text-sm font-bold`, `space-y-2.5` → `space-y-2`

---

### 4. ScheduleOverview

- `rounded-[24px]` → `rounded-2xl`
- заголовок: `text-xl font-semibold` → `text-base font-bold`
- описание: `text-sm leading-relaxed text-stone-600` → `text-xs text-stone-400`
- счётчик свободных: `text-xl` → `text-base font-bold tabular-nums`
- подпись счётчика: `text-xs` → `text-[10px]`
- карточки слотов: `min-h-[96px] w-[150px] p-3.5` → `min-h-[68px] w-[108px] px-3 py-2`
- время: `text-xl font-semibold` → `text-base font-bold`
- метка дня: `text-[11px] font-semibold uppercase tracking-wider`

---

### 5. LoginPanel / ProfileSettings

**LoginPanel:**
- заголовок: `text-xl font-semibold` → `text-base font-bold`
- описание: `text-sm text-stone-600` → `text-xs text-stone-400`
- отступы: `space-y-3.5` → `space-y-3`

**ProfileSettings:**
- заголовок: `text-xl font-semibold` → `text-base font-bold`
- описание: `text-sm text-stone-600` → `text-xs text-stone-400`
- инфо-блок: `p-3.5` → `px-4 py-3`
- отступы: `space-y-3.5` → `space-y-3`
- textarea: `rows=3` → `rows=2`
- кнопки: убраны `size="lg"` у secondary/tertiary, `gap-3` → `gap-2`

---

### 6. selectClassName / StepHeader / BackButton / LessonCard

**selectClassName:**
- `h-12 rounded-2xl px-4 text-base` → `h-9 rounded-xl px-3.5 text-sm`
- `focus:ring-4` → `focus:ring-2`

**StepHeader (прогресс-бар):**
- `px-5 py-4` → `px-5 py-3`
- текст шага: `text-sm font-medium text-stone-500` → `text-xs font-medium text-stone-400`
- полоса: `mt-3 h-1.5` → `mt-2 h-1`

**BackButton:**
- `mb-5 min-h-10 text-base font-medium text-stone-500` → `mb-3 text-sm font-medium text-stone-400 hover:text-stone-700 transition-colors`
- ArrowLeft: `size={18}` → `size={14}`

**LessonCard (карточка занятия в StudentDashboard):**
- `rounded-2xl border p-4` → `rounded-xl border px-4 py-3`
- заголовок: `text-lg font-semibold` → `text-sm font-semibold`
- детали: убраны лишние строки, один `text-xs truncate`
- CalendarDays: `size={22}` → `size={15}`

---

## Что проверили

- `npm run typecheck` — ✅
- `npm run build` — ✅
- `git commit c209677` — 8 файлов, 278 вставок / 287 удалений

## Что ещё не сделано

### Визуальное тестирование в браузере

Ни в этой, ни в прошлой итерации полного браузерного прогона не было.
Нужно руками открыть:

- `/` — лендинг
- `/school/virazh` — главная автошколы
- `/school/virazh` → кликнуть «Записаться» — все 8 шагов
- Кабинет ученика после логина
- Расписание автошколы
- `/admin` — дашборд

Особенно на мобильной ширине (375px).

### Иерархия в кабинете ученика

«Ближайшее занятие» должно быть ещё более доминирующим, чем список «Мои записи».
Сейчас лучше, но всё ещё нет сильного визуального разрыва по весу между блоками.

### Админка

Страницы `/admin/bookings`, `/admin/slots`, `/admin/instructors` не трогали.
Они всё ещё визуально тяжелее нужного.
Следующий проход: привести списки к одному ритму, убрать избыточный вторичный текст.

---

## Изменённые файлы (все в HEAD)

```
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Input.tsx
src/components/ui/PageHeader.tsx
src/components/ui/Section.tsx
src/pages/LandingPage.tsx
src/pages/SchoolPage.tsx
src/pages/admin/Dashboard.tsx
```

---

## Готовый промпт для продолжения в новом чате

```text
Мы продолжаем проект DriveDesk (SaaS для автошкол) в репозитории C:\Users\First\Desktop\DRIVING-SCHOOLS.

Прочитай handoff-файлы в папке C:\Users\First\Desktop\DRIVING-SCHOOLS\handoff-2026-04-27, особенно:
- 01-full-context.md
- 07-ux-density-pass.md
- 08-booking-flow-density-pass.md  ← последний, главный

Контекст:
- Supabase уже подключен и рабочий.
- Cloudflare Pages проект: drivingschool-6wy (автодеплой из main).
- Последний коммит: c209677 — два прохода по UX-плотности.
- typecheck и build чистые.
- Все UI примитивы уплотнены.
- SchoolPage полностью уплотнена (home, booking flow, dashboard, schedule, login, settings).
- admin/Dashboard уплотнен.

Что нужно делать дальше (приоритет):

1. Открыть интерфейс в браузере и визуально проверить:
   - /school/virazh — главная + секции
   - Все 8 шагов записи (category → branch → instructor → date → time → details → review → profile)
   - Кабинет ученика после входа
   - Расписание
   - /admin

2. После проверки: сделать точечные правки по тому, что визуально всё ещё жирно или рассыпается.

3. Потом — UX-проход по admin/bookings, admin/slots, admin/instructors (они ещё не трогались).

Правила:
- Использовать SKILL.md в корне как инструкцию по стилю.
- Не добавлять лендинговую красоту.
- Убирать лишний скролл, усиливать иерархию.
- В конце каждой итерации: написать новый handoff с промптом для продолжения.
```
