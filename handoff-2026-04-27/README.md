# DriveDesk handoff - 2026-04-27

Эта папка нужна, чтобы продолжить работу в новом чате или с другого устройства без потери контекста.

Читайте по порядку:

1. `01-full-context.md` - полный контекст проекта, что уже сделано, что важно помнить.
2. `02-next-actions.md` - куда двигаться дальше и что пилить в первую очередь.
3. `03-resume-prompt.md` - готовый текст для нового чата.
4. `04-runbook.md` - как запускать, проверять, деплоить и где что настроено.

Главное состояние на сейчас:

- рабочий прод: `https://drivingschool-6wy.pages.dev/school/virazh`;
- репозиторий: `jdjajdajjd/drivingschool`;
- ветка: `main`;
- база: Supabase;
- Cloudflare Pages project, который остался: `drivingschool`;
- лишний Cloudflare Pages project `drivedesk` уже удалён;
- GitHub Actions больше не деплоит в `drivedesk`, он только проверяет сборку;
- деплой в `drivingschool` идет через Git connection Cloudflare.

Важно: в эту папку специально не записаны реальные ключи Supabase/Cloudflare. Они есть в локальном `.env.local` и в настройках Cloudflare/GitHub, но не должны попадать в репозиторий.
