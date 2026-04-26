# Runbook

## Локальный запуск

```bash
npm install
npm run dev
```

Открыть:

```text
http://localhost:5173/school/virazh
```

## Проверки

```bash
npm run typecheck
npm run build
```

Build сейчас проходит. Может быть предупреждение про большой JS chunk из-за Supabase SDK. Это не падение, но позже надо сделать code splitting.

## Supabase

Нужные env переменные:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Локально они лежат в `.env.local`.

Шаблон лежит в:

```text
.env.example
```

Единый SQL:

```text
supabase/DRIVEDESK_FULL_SETUP.sql
```

Применить SQL через скрипт можно так, если есть `SUPABASE_DATABASE_URL`:

```bash
npm run supabase:apply
```

Важно: не записывать `SUPABASE_DATABASE_URL`, service role key или пароль базы в репозиторий.

## Cloudflare

Оставляемый проект:

```text
drivingschool
https://drivingschool-6wy.pages.dev
```

Лишний проект:

```text
drivedesk
https://drivedesk.pages.dev
```

Состояние:

- `drivingschool` подключен к GitHub и сам деплоит `main`;
- `drivedesk` больше не получает деплой из GitHub Actions;
- `.github/workflows/deploy.yml` теперь только запускает build.

Если пользователь скажет удалить `drivedesk`, можно удалить Cloudflare Pages project `drivedesk`.

## Git

Текущая ветка:

```text
main
```

После изменений:

```bash
git status --short
npm run typecheck
npm run build
git add ...
git commit -m "..."
git push origin main
```

После пуша проверить:

```text
https://drivingschool-6wy.pages.dev/school/virazh
```

## Что потыкать после деплоя

1. Открыть `/school/virazh`.
2. Записаться как новый ученик.
3. Выбрать филиал.
4. Выбрать инструктора.
5. Выбрать дату.
6. Выбрать один или два слота.
7. Ввести имя и телефон.
8. Подтвердить запись.
9. На вопрос профиля выбрать создать профиль.
10. Вернуться на страницу школы и проверить, что виден профиль.
11. Открыть `/admin/bookings`.
12. Проверить, что запись появилась.
13. Попробовать отменить/завершить/перенести запись.

## Известные риски

- Нет полноценной авторизации.
- RLS пока не production-grade.
- Часть админки еще не полностью Supabase-first.
- Профиль ученика пока завязан на локальное согласие/браузер.
- Multi-slot confirmation надо улучшить.
- Нужны понятные empty states и error states.
- Нужно убрать второй Cloudflare project после подтверждения.
