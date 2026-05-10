# vroom admin clean-slate spec

## Product sentence

vroom admin is a calm mobile-first office for a driving school: prepare the school for bookings, run today's lessons, handle calls, and keep the schedule filled.

## What this rebuild ignores

Ignore previous dashboard metaphors, red warning panels, dark command-center blocks, decorative zero metrics, and “operator journal” aesthetics as the main visual idea. The new cabinet starts from first principles.

## Primary users

1. Owner/director: wants to know whether the school can accept bookings and whether today is under control.
2. Administrator: answers calls, books/reschedules/cancels lessons, creates slots.
3. Instructor: separate mobile day tool later, but admin screens must prepare good instructor data.

## Design direction

Name: quiet office.

Mood:
- clear, trustworthy, non-aggressive;
- more like a modern bank back-office than SaaS toy;
- light surfaces, careful hierarchy, no alarm color unless something truly failed;
- mobile app feeling on phone, productivity app feeling on desktop.

Core tokens:
- app background: `#F6F7F9`
- surface: `#FFFFFF`
- text: `#111827`
- secondary text: `#667085`
- border: `#E4E7EC`
- primary: `#111827`
- link/action blue: `#2563EB`
- soft blue surface: `#EFF6FF`
- success: `#15803D`
- warning: `#B45309`
- danger: `#B42318` only for real destructive/errors

Shape:
- app cards 16px radius;
- controls 12px radius;
- no heavy shadows; use borders and subtle surface contrast;
- 44px+ controls.

Typography:
- short Russian copy;
- screen title 26-34 mobile/desktop;
- labels 12-13 uppercase only sparingly;
- body 14-16.

## Information architecture

Top-level admin tabs:
1. Сегодня
2. Записи
3. Расписание
4. Ученики
5. Школа

The dashboard route is named “Сегодня”, not “Пульт”.

## Dashboard states

### Empty/new school

Goal: help user finish setup. No statistics. No red statuses.

Above the fold mobile:
- Brand shell header.
- Screen title: “Запуск школы”.
- One sentence: “Настройте 4 вещи — и ученики смогут записываться онлайн.”
- Progress pill: `0 из 4 готово`.
- Primary CTA: next incomplete step.
- Setup list:
  1. Контакты
  2. Филиал
  3. Инструктор
  4. Расписание

Each setup row:
- status dot/check;
- title;
- why it matters;
- action button.

Bottom: preview block “Что увидит ученик” with public site button.

### Active school

Goal: decide what to do next.

Above the fold:
- “Сегодня”
- next lesson card if any;
- three compact chips: lessons today, free slots week, attention items;
- primary action: “Записать ученика”.

Sections:
- Attention: requests, overdue active lessons, no free slots.
- Next lessons list.
- Quick actions.

## Bookings

Goal: answer a call and manage bookings.

Layout:
- Top “Новая запись” panel: name, phone, date/filter, select slot, create.
- Then segmented control: Сегодня / Будущие / Прошлые / Все.
- List rows, not decorative cards.
- On mobile rows are compact blocks with action buttons.

## Slots

Goal: fill and maintain schedule.

Layout:
- Top “Создать окна” sheet-like panel.
- Week health: free, booked, gaps.
- Day grouped schedule.
- Each row: time, instructor, branch, student/status, action.

## Functional priorities

P0 now:
- clean dashboard empty state;
- coherent shell/nav labels;
- unified Dashboard/Bookings/Slots styling;
- preserve existing CRUD logic;
- mobile first.

P1 later:
- global requests inbox;
- payments/packages/hours;
- lesson logs/progress;
- documents;
- reminders.

## Acceptance

- On empty school mobile screenshot, it must look like a setup wizard, not a broken admin panel.
- No block with four zero stats on new account.
- No red status unless there is a real destructive/error event.
- Bottom nav label is clear: “Сегодня”, “Записи”, “График”, “Ученики”, “Школа”.
- Dashboard, bookings, slots share background, border, radius, typography, buttons.
- Build/typecheck pass.
