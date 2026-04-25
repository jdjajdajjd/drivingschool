# DriveDesk

SaaS MVP для автошкол на `Vite + React + TypeScript + Tailwind + React Router + localStorage`.

Проект пока работает без backend, без Supabase и без auth. Все данные хранятся локально в браузере, поэтому это demo/localStorage режим с рабочим booking flow, админкой школы и product-layer поверх неё.

## Стек

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- localStorage service layer

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:5173`

## Основные роуты

### Публичные

- `/` — landing
- `/school/:slug` — публичная запись в автошколу
- `/booking/:bookingId` — подтверждение записи, `.ics`, отмена
- `/instructor/:token` — личная страница инструктора

### Админка школы

- `/admin` — overview/dashboard
- `/admin/bookings` — записи
- `/admin/slots` — слоты
- `/admin/students` — ученики
- `/admin/students/:studentId` — профиль и история ученика
- `/admin/instructors` — инструкторы
- `/admin/branches` — филиалы
- `/admin/modules` — каталог модулей
- `/admin/modules/:moduleId` — карточка модуля
- `/admin/settings` — настройки школы, лимиты, branding, demo reset

### Superadmin

- `/superadmin` — overview по платформе
- `/superadmin/schools` — список автошкол
- `/superadmin/schools/new` — создание автошколы
- `/superadmin/schools/:schoolId` — карточка автошколы

## Что уже работает

### Booking flow

- выбор филиала
- выбор инструктора
- выбор даты
- выбор слота
- ввод имени и телефона
- нормализация телефона к виду `7xxxxxxxxxx`
- поиск или создание `student` по `normalizedPhone`
- создание `booking`
- перевод `slot.status` в `booked`
- редирект на `/booking/:bookingId`
- `.ics`
- отмена записи
- лимит будущих активных записей на ученика

### Админка школы

- dashboard с метриками и диагностикой
- записи с фильтрами, отменой, проведением и переносом
- слоты с одиночным и массовым созданием
- ученики с историей
- инструкторы с личной ссылкой
- филиалы
- настройки школы
- demo reset

### Product-layer

- база: `4 990 ₽/мес`
- каталог подключаемых модулей
- расчёт monthly total и one-time услуг
- summary по стоимости школы
- superadmin overview по школам

## Модель монетизации

Без тарифов `Start / Plus / Pro`.

Модель сейчас такая:

- база: `4 990 ₽/мес`
- плюс подключаемые модули

Примеры модулей:

- SMS-уведомления
- Telegram-уведомления
- Брендирование страницы
- Виджет записи на сайт
- Онлайн-оплата
- Расширенная аналитика
- Роли и дополнительные админы
- Автонапоминания
- Импорт из Excel
- Дополнительный инструктор
- Дополнительный филиал

История ученика входит в базу и не считается модулем.

## Demo data

При первом запуске автоматически создаются demo data:

- demo school `Вираж`
- 3 филиала
- 5 инструкторов
- слоты
- записи
- ученики
- лимит записи `2`
- несколько подключённых модулей для примера

Seed создаётся только если данных ещё нет или если изменилась `SEED_VERSION`.

## Сброс demo data

В `/admin/settings` и `/superadmin` есть reset demo data.

После сброса:

- localStorage проекта очищается
- demo seed создаётся заново
- публичная страница, настройки и модули возвращаются в исходное demo-состояние

## Как протестировать demo flow

### Публичная запись

1. Открыть `/school/virazh`
2. Выбрать филиал, инструктора, дату и слот
3. Ввести имя и телефон
4. Создать запись
5. Открыть `/booking/:bookingId`
6. Скачать `.ics`
7. Отменить запись

### Product-layer

1. Открыть `/admin/modules`
2. Подключить/отключить модули
3. Проверить summary стоимости
4. Открыть `/admin/settings`
5. Изменить название, описание и цвет
6. Открыть `/school/:slug` и проверить branding
7. Открыть `/superadmin`

## Команды

```bash
npm run dev
npm run typecheck
npm run build
```

`lint`-скрипта сейчас нет.

## Ограничения текущего этапа

- backend пока не подключён
- Supabase пока не подключён
- auth пока нет
- данные живут в localStorage
- нет настоящей оплаты
- нет настоящих SMS/Telegram API
- нет полноценной cross-tab синхронизации

Это не production backend-ready версия, а сильный frontend MVP с рабочей продуктовой моделью и понятной демо-обвязкой.
