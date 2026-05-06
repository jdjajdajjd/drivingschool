# Vroom Supabase

Use one SQL file only:

```text
supabase/DRIVEDESK_FULL_SETUP.sql
```

`DRIVEDESK_FULL_SETUP.sql` is a historical filename kept to avoid renaming the actual SQL path.

## Option 1: Supabase SQL Editor

For a live database, run only the safe patch section:

```text
-- BEGIN DRIVEDESK_SAFE_PATCH
-- END DRIVEDESK_SAFE_PATCH
```

1. Open Supabase Dashboard.
2. Open the project.
3. Go to SQL Editor.
4. Create a new query.
5. Copy only the safe patch section from `DRIVEDESK_FULL_SETUP.sql`.
6. Paste it into the query and run it.

Do not paste the full reset section into a live production database. The full reset path is only for rebuilding a disposable development database because it drops and recreates Vroom tables, seed data, policies, and RPCs.

## Option 2: local terminal

Set a local database URL and run:

```powershell
$env:SUPABASE_DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
npm run supabase:apply
```

Do not commit the database URL or passwords.
