# DriveDesk — Цифровая платформа для автошкол

Демо SaaS для автошкол: онлайн-запись на вождение, расписание инструктора, каталог модулей, аналитика.

## Быстрый старт

```bash
npm install
npm run dev
```

Открыть: http://localhost:5173

## Роуты

| URL | Описание |
|-----|----------|
| `/` | Лендинг SaaS |
| `/school/virazh` | Публичная страница записи «Вираж» |
| `/booking/:id` | Подтверждение записи |
| `/admin` | Дашборд автошколы |
| `/admin/bookings` | Управление записями |
| `/admin/slots` | Расписание слотов |
| `/admin/instructors` | Инструкторы |
| `/admin/branches` | Филиалы |
| `/admin/modules` | Каталог модулей |
| `/admin/modules/:id` | Детальная страница модуля |
| `/instructor/tok-petrov-2024` | Расписание Петрова |
| `/superadmin` | Суперадминка |

## Демо-данные

Автоматически создаются при первом запуске:

- Автошкола **«Вираж»** (slug: `virazh`)
- 3 филиала: Центральный, Северное, Западное отделения
- 5 инструкторов с биографиями и аватарами
- Слоты на 7 дней вперёд (~150 слотов)
- 18 демо-записей (mix pending/confirmed/completed)
- 3 активных модуля (Telegram, Аналитика, Автонапоминания)

## Команды

```bash
npm run dev        # Dev-сервер с hot reload
npm run build      # Production сборка
npm run preview    # Предпросмотр production сборки
npm run typecheck  # Проверка типов TypeScript
```

## Стек

- **Vite** + **React** + **TypeScript**
- **TailwindCSS** — кастомная конфигурация с цветовой системой
- **React Router v6** — клиентский роутинг
- **Framer Motion** — анимации и переходы
- **Lucide React** — иконки
- **date-fns** — работа с датами
- **localStorage** — хранилище данных (без бэкенда)

## Структура

```
src/
  components/
    ui/          Button, Card, Badge, Input, Avatar, Modal
    layout/      AdminLayout, AdminSidebar, PublicNav
  pages/
    LandingPage.tsx
    SchoolPage.tsx
    BookingConfirmation.tsx
    admin/       Dashboard, Bookings, Slots, Instructors, Branches, Modules, ModuleDetail
    InstructorPage.tsx
    SuperAdmin.tsx
  services/
    storage.ts   localStorage CRUD
    seed.ts      Генерация демо-данных
    modules.ts   Каталог модулей (константы)
  types/index.ts
  lib/utils.ts
  utils/date.ts
```

## Монетизация

- **База:** 4 990 ₽/мес — всё необходимое включено
- **Модули:** подключаются отдельно от 0 до 1 490 ₽

## Следующие шаги

1. Аутентификация (JWT или Supabase Auth)
2. Бэкенд API (Next.js API routes или Supabase)
3. Реальные SMS/Telegram уведомления
4. Онлайн-оплата (Тинькофф Касса)
5. Мобильное приложение для инструктора
6. Email-уведомления при записи
