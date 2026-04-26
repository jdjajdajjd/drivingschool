# DriveDesk Supabase

Use one SQL file only:

```text
supabase/DRIVEDESK_FULL_SETUP.sql
```

## Option 1: Supabase SQL Editor

1. Open Supabase Dashboard.
2. Open the project.
3. Go to SQL Editor.
4. Create a new query.
5. Paste the full contents of `DRIVEDESK_FULL_SETUP.sql`.
6. Run it.

The file is intentionally idempotent for the current development stage: it drops and recreates DriveDesk tables, seed data, policies, and the public booking RPC.

## Option 2: local terminal

Set a local database URL and run:

```powershell
$env:SUPABASE_DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
npm run supabase:apply
```

Do not commit the database URL or passwords.
