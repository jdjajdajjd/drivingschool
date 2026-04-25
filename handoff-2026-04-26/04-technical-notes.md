# Technical notes

## Important files

- `src/pages/SchoolPage.tsx` - публичный профиль ученика и booking flow.
- `src/pages/BookingConfirmation.tsx` - экран подтверждения.
- `src/pages/admin/Settings.tsx` - настройки школы.
- `src/pages/admin/Slots.tsx` - управление слотами.
- `src/pages/admin/Students.tsx` - список учеников.
- `src/pages/admin/StudentDetail.tsx` - карточка ученика.
- `src/services/storage.ts` - localStorage database layer.
- `src/services/bookingService.ts` - создание, отмена, перенос, ICS.
- `src/services/seed.ts` - demo seed.
- `src/types/index.ts` - основные типы.
- `src/lib/utils.ts` - утилиты, включая форматирование длительности.
- `.github/workflows/deploy.yml` - GitHub Actions деплой в Cloudflare Pages project `drivedesk`.

## Current data layer

`storage.ts` хранит все в localStorage:

- schools
- branches
- instructors
- slots
- bookings
- students
- school modules
- slot locks

`SEED_VERSION = '6'`.

Это удобно для demo, но не подходит для запуска:

- данные разные на каждом устройстве;
- невозможно нормально авторизоваться;
- невозможно надежно защитить слот от гонки;
- нельзя сделать настоящий профиль ученика;
- нельзя дать директору стабильную админку.

## Current booking behavior

`createBooking` создает одну запись за вызов:

- валидирует имя и телефон;
- проверяет слот;
- ставит localStorage lock;
- проверяет лимит активных записей;
- создает или обновляет ученика;
- создает booking;
- переводит slot в `booked`.

Для нескольких слотов текущий frontend вызывает создание несколько раз. Для production это нужно заменить на backend endpoint:

```text
POST /api/booking-groups
```

Endpoint должен:

- принять массив slot ids;
- проверить лимиты;
- проверить доступность всех слотов;
- создать booking group;
- создать все bookings;
- забронировать все slots;
- вернуть group id;
- при ошибке ничего не создавать.

## Needed backend API

Минимальный набор:

```text
GET    /api/schools/:slug/public
GET    /api/students/me
PATCH  /api/students/me
GET    /api/students/me/bookings
GET    /api/availability
POST   /api/booking-groups
GET    /api/booking-groups/:id
POST   /api/booking-groups/:id/calendar.ics
POST   /api/bookings/:id/cancel
POST   /api/bookings/:id/reschedule

GET    /api/admin/settings
PATCH  /api/admin/settings
GET    /api/admin/students
GET    /api/admin/students/:id
PATCH  /api/admin/students/:id
GET    /api/admin/slots
POST   /api/admin/slots
POST   /api/admin/slots/bulk
GET    /api/admin/bookings
PATCH  /api/admin/bookings/:id
```

## Types to add or formalize

```ts
type BranchSelectionMode =
  | 'student_choice'
  | 'student_assigned'
  | 'admin_only'

interface SchoolBookingPolicy {
  schoolId: string
  branchSelectionMode: BranchSelectionMode
  maxSlotsPerBooking: number
  allowMultipleDays: boolean
  defaultLessonDuration: number
  bookingWindowDays: number
  cancelBeforeHours: number
  rescheduleBeforeHours: number
  showInstructorsToStudents: boolean
  allowInstructorChoice: boolean
}

interface BookingGroup {
  id: string
  schoolId: string
  studentId: string
  status: 'active' | 'partially_cancelled' | 'cancelled' | 'completed'
  createdAt: string
}
```

## Deployment issue

There are two deployment paths:

1. Cloudflare Pages project `drivingschool` with Git connection.
2. GitHub Actions workflow deploying to Cloudflare Pages project `drivedesk`.

This is why Cloudflare dashboard can show two deployments after one push.

Fix:

- choose one production project;
- remove the other deployment path;
- update docs and URLs.

Recommended:

- keep `drivingschool`;
- remove `.github/workflows/deploy.yml` or change it to build/test only;
- delete/archive `drivedesk` Cloudflare Pages project after confirming no traffic depends on it.

## Security notes

Do not commit:

- Cloudflare API tokens;
- SMS provider tokens;
- admin passwords;
- private keys.

Use:

- GitHub Actions secrets;
- Cloudflare project environment variables;
- separate preview/production secrets.

The user shared a Cloudflare token in chat. It should be rotated before real production launch.
