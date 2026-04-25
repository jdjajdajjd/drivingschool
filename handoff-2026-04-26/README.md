# DriveDesk handoff - 2026-04-26

Это папка для продолжения работы завтра с другого устройства без потери контекста.

## Быстрый старт

1. Открыть репозиторий `jdjajdajjd/drivingschool`.
2. Перейти на ветку `main`.
3. Установить зависимости:

```bash
npm install
```

4. Запустить локально:

```bash
npm run dev
```

5. Открыть:

```text
http://localhost:5173/school/virazh
```

## Где главный контекст

- [01-current-state.md](01-current-state.md) - что уже сделано и как сейчас работает.
- [02-user-feedback.md](02-user-feedback.md) - все правки и продуктовые замечания от пользователя.
- [03-launch-plan.md](03-launch-plan.md) - план доведения продукта до запуска.
- [04-technical-notes.md](04-technical-notes.md) - важные файлы, архитектура и технические риски.
- [05-tomorrow-checklist.md](05-tomorrow-checklist.md) - что делать завтра по шагам.
- [06-resume-prompt.md](06-resume-prompt.md) - готовый промпт для нового чата/устройства.

## Самая важная мысль

Текущий проект - сильный frontend MVP, но не production-ready продукт: данные пока живут в `localStorage`, настоящей авторизации и backend API нет. Если цель - запуск без заглушек, главный следующий шаг не очередная косметика, а переход на реальное хранилище, авторизацию ученика и атомарную запись слотов.

## Последнее известное состояние Git

Ветка: `main`

Последние коммиты:

```text
312eff1 feat: add student profile booking experience
4c37fff fix: complete accessible booking flow
0be9958 feat: simplify booking UI for 40+ users and add Cloudflare Pages deploy
98a7b1c feat: reduce visual noise across core UI
92011c0 feat: polish demo experience and final QA pass
```

## Важно про секреты

Cloudflare API token и Account ID не записаны в эту папку специально. Их нельзя хранить в репозитории. Секреты уже добавлялись в GitHub Actions как:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Если завтра понадобится деплой, проверять их нужно в GitHub Repository Settings -> Secrets and variables -> Actions.
