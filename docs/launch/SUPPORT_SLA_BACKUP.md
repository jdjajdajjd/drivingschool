# Support, SLA, Backup

## Support Targets

- P1: login blocked, bookings cannot be created, data not visible. First response: same day during launch pilots.
- P2: wrong status, import issue, UI bug. First response: next business day.
- P3: cosmetic issue or feature request. Triage during weekly planning.

## Health Checks

- Production URL opens.
- `/api/health` returns ok.
- Supabase URL and service role environment variables are present.
- Telegram lead notification path is working.
- Smoke script passes against production.

## Backup Routine

- Before onboarding a real school: export current students CSV from the school cabinet.
- Weekly during pilot: Supabase backup/export through dashboard or CLI.
- Before schema changes: create a DB backup and run smoke tests on production after deploy.

## Incident Runbook

1. Record time, user, route, school, screenshot, and last action.
2. Check Cloudflare deploy status and `/api/health`.
3. Check Supabase availability and recent migrations.
4. If booking conflict is reported, verify slot status, booking id, and duplicate active bookings.
5. Patch, deploy, smoke test, then write a short incident note.
